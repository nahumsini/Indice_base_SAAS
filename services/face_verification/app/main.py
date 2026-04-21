from __future__ import annotations

import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

import cv2
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl


MODEL_DIR = Path(os.environ.get("FACE_MODEL_DIR", "/tmp/face-models"))
YUNET_URL = os.environ.get(
    "FACE_MODEL_YUNET_URL",
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
)
SFACE_URL = os.environ.get(
    "FACE_MODEL_SFACE_URL",
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
)


class CaptureReference(BaseModel):
    step: Literal["neutral", "left", "right"]
    download_url: HttpUrl


class EnrollRequest(BaseModel):
    captures: list[CaptureReference]


class VerifyRequest(BaseModel):
    captures: list[CaptureReference]
    enrolled_embeddings: list[list[float]]


app = FastAPI(title="Indice HR Face Verification Service")


def ensure_model(url: str, target_name: str) -> str:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    target = MODEL_DIR / target_name
    if target.exists():
        return str(target)

    response = requests.get(url, timeout=60)
    response.raise_for_status()
    target.write_bytes(response.content)
    return str(target)


def create_detector(model_path: str):
    if hasattr(cv2, "FaceDetectorYN_create"):
        return cv2.FaceDetectorYN_create(model_path, "", (320, 320), 0.9, 0.3, 5000)
    return cv2.FaceDetectorYN.create(model_path, "", (320, 320), 0.9, 0.3, 5000)


def create_recognizer(model_path: str):
    if hasattr(cv2, "FaceRecognizerSF_create"):
        return cv2.FaceRecognizerSF_create(model_path, "")
    return cv2.FaceRecognizerSF.create(model_path, "")


@lru_cache(maxsize=1)
def get_models():
    detector_path = ensure_model(YUNET_URL, "face_detection_yunet_2023mar.onnx")
    recognizer_path = ensure_model(SFACE_URL, "face_recognition_sface_2021dec.onnx")
    detector = create_detector(detector_path)
    recognizer = create_recognizer(recognizer_path)
    return detector, recognizer


def download_image(url: str) -> np.ndarray:
    source = urlparse(url).netloc or "object storage"
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to download image from {source}.",
        ) from exc

    data = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to decode image.")
    return image


def detect_single_face(image: np.ndarray):
    detector, _ = get_models()
    height, width = image.shape[:2]
    detector.setInputSize((width, height))
    _, faces = detector.detect(image)
    if faces is None or len(faces) != 1:
        raise HTTPException(status_code=400, detail="Expected exactly one face in the image.")
    return faces[0]


def extract_embedding(image: np.ndarray, face_row) -> list[float]:
    _, recognizer = get_models()
    aligned_face = recognizer.alignCrop(image, face_row)
    embedding = recognizer.feature(aligned_face)
    return embedding.flatten().astype(float).tolist()


def cosine_similarity(left: list[float], right: list[float]) -> float:
    left_vec = np.asarray(left, dtype=np.float32)
    right_vec = np.asarray(right, dtype=np.float32)
    denominator = np.linalg.norm(left_vec) * np.linalg.norm(right_vec)
    if denominator == 0:
        return 0.0
    return float(np.dot(left_vec, right_vec) / denominator)


def centroid(vectors: list[list[float]]) -> list[float]:
    matrix = np.asarray(vectors, dtype=np.float32)
    return np.mean(matrix, axis=0).astype(float).tolist()


def yaw_proxy(face_row) -> float:
    right_eye_x = float(face_row[4])
    left_eye_x = float(face_row[6])
    nose_x = float(face_row[8])
    eye_mid = (right_eye_x + left_eye_x) / 2.0
    eye_distance = max(abs(left_eye_x - right_eye_x), 1.0)
    return (nose_x - eye_mid) / eye_distance


def verify_basic_liveness(sequence: list[tuple[str, float, list[float]]]) -> tuple[bool, str | None]:
    if len(sequence) != 3:
        return False, "Basic liveness requires 3 captures."

    by_step = {step: (yaw, embedding) for step, yaw, embedding in sequence}
    if set(by_step.keys()) != {"neutral", "left", "right"}:
        return False, "Required liveness steps are missing."

    neutral_yaw = by_step["neutral"][0]
    left_yaw = by_step["left"][0]
    right_yaw = by_step["right"][0]

    if abs(neutral_yaw) > 0.18:
        return False, "Neutral pose check failed."

    left_delta = left_yaw - neutral_yaw
    right_delta = right_yaw - neutral_yaw
    if abs(left_delta) < 0.06 or abs(right_delta) < 0.06:
        return False, "Head movement challenge failed."

    if math.copysign(1.0, left_delta) == math.copysign(1.0, right_delta):
        return False, "Head turns must move in opposite directions."

    embeddings = [embedding for _, _, embedding in sequence]
    pairwise = [
        cosine_similarity(embeddings[0], embeddings[1]),
        cosine_similarity(embeddings[0], embeddings[2]),
        cosine_similarity(embeddings[1], embeddings[2]),
    ]
    if min(pairwise) < 0.35:
        return False, "The captured face sequence is not consistent."

    return True, None


def process_capture_sequence(captures: list[CaptureReference]) -> list[tuple[str, float, list[float]]]:
    sequence: list[tuple[str, float, list[float]]] = []
    for capture in captures:
        image = download_image(str(capture.download_url))
        face_row = detect_single_face(image)
        embedding = extract_embedding(image, face_row)
        sequence.append((capture.step, yaw_proxy(face_row), embedding))
    return sequence


@app.get("/internal/health")
def health():
    try:
        get_models()
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/internal/face/enroll")
def enroll(request: EnrollRequest):
    sequence = process_capture_sequence(request.captures)
    embeddings = [embedding for _, _, embedding in sequence]

    pairwise = [
        cosine_similarity(embeddings[0], embeddings[1]),
        cosine_similarity(embeddings[0], embeddings[2]),
        cosine_similarity(embeddings[1], embeddings[2]),
    ]
    if min(pairwise) < 0.35:
        return {"status": "failed", "embeddings": [], "failure_reason": "Enrollment captures are not consistent."}

    return {"status": "success", "embeddings": embeddings, "failure_reason": None}


@app.post("/internal/face/verify")
def verify(request: VerifyRequest):
    sequence = process_capture_sequence(request.captures)
    liveness_passed, liveness_failure = verify_basic_liveness(sequence)
    live_embeddings = [embedding for _, _, embedding in sequence]
    enrollment_centroid = centroid(request.enrolled_embeddings)
    live_centroid = centroid(live_embeddings)
    match_score = cosine_similarity(live_centroid, enrollment_centroid)
    matched = liveness_passed and match_score >= 0.38

    failure_reason = None
    if not liveness_passed:
      failure_reason = liveness_failure
    elif not matched:
      failure_reason = "Face match score is below the acceptance threshold."

    return {
        "status": "success",
        "matched": matched,
        "match_score": match_score,
        "liveness_passed": liveness_passed,
        "failure_reason": failure_reason,
    }
