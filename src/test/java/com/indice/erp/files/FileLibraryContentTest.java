package com.indice.erp.files;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import com.indice.erp.auth.AuthSessionUser;
import java.io.OutputStream;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.http.HttpStatus.*;

class FileLibraryContentTest {
 FileAccess access;FileUploadService uploads;MockMvc mvc;AuthSessionUser actor=new AuthSessionUser(1L,2L,"Synthetic","user");
 @BeforeEach void setup(){access=mock(FileAccess.class);uploads=mock(FileUploadService.class);mvc=MockMvcBuilders.standaloneSetup(new FileLibraryController(access,mock(FileLibraryService.class),uploads)).build();when(access.actor(any(),isNull(),eq(false))).thenReturn(actor);when(uploads.content(actor,"file")).thenReturn(new FileContracts.Entry("file",null,"FILE","Notes.txt","text/plain",5,"Synthetic",true,3,false,1,Instant.now()));doAnswer(call->{long offset=call.getArgument(2),length=call.getArgument(3);((OutputStream)call.getArgument(4)).write("hello".substring((int)offset,(int)(offset+length)).getBytes());return null;}).when(uploads).stream(eq(actor),eq("file"),anyLong(),anyLong(),any());}
 @Test void authenticatedMediaSupportsSingleByteRangesAndPrivateHeaders()throws Exception{var result=mvc.perform(get("/api/v1/files/file/content?preview=true").session(new MockHttpSession()).header("Range","bytes=1-3")).andExpect(request().asyncStarted()).andExpect(status().isPartialContent()).andExpect(header().string("Content-Range","bytes 1-3/5")).andExpect(header().string("Cache-Control","no-store")).andExpect(header().string("Cross-Origin-Resource-Policy","same-origin")).andExpect(header().string("X-Content-Type-Options","nosniff")).andReturn();mvc.perform(asyncDispatch(result)).andExpect(content().string("ell"));}
 @Test void suffixRangeWorksAndOrdinaryDownloadIsAttachment()throws Exception{var result=mvc.perform(get("/api/v1/files/file/content").header("Range","bytes=-2")).andExpect(status().isPartialContent()).andExpect(header().string("Content-Type","application/octet-stream")).andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.startsWith("attachment;"))).andReturn();mvc.perform(asyncDispatch(result)).andExpect(content().string("lo"));}
 @Test void invalidAndMultipleRangesNeverReadStorage()throws Exception{for(String range:new String[]{"bytes=9-10","bytes=0-1,3-4","wrong"})mvc.perform(get("/api/v1/files/file/content").header("Range",range)).andExpect(status().isRequestedRangeNotSatisfiable()).andExpect(header().string("Content-Range","bytes */5"));verify(uploads,never()).stream(any(),anyString(),anyLong(),anyLong(),any());}
 @Test void noAccessNeverStartsAStream()throws Exception{when(uploads.content(actor,"file")).thenThrow(new ResponseStatusException(NOT_FOUND));mvc.perform(get("/api/v1/files/file/content")).andExpect(status().isNotFound());verify(uploads,never()).stream(any(),anyString(),anyLong(),anyLong(),any());}
}
