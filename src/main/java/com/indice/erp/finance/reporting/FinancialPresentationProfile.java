package com.indice.erp.finance.reporting;

import java.util.List;
import com.indice.erp.finance.reporting.FinancialReportingContracts.FinancialStatement;
import com.indice.erp.finance.reporting.FinancialReportingContracts.StatementLine;

record FinancialPresentationProfile(String country, String framework) {
    String incomeTax() {
        return switch (country) {
            case "MX" -> "Impuesto sobre la renta (ISR)";
            case "CA" -> "Impuesto a las ganancias (income tax / impôt sur le revenu)";
            case "US" -> "Impuesto a las ganancias (income tax)";
            case "CO" -> "Impuesto sobre la renta";
            case "BR" -> "Impuestos a las ganancias (IRPJ / CSLL)";
            default -> "Impuesto a las ganancias";
        };
    }
    String indirectTaxNames() {
        return switch (country) {
            case "MX" -> "IVA";
            case "CA" -> "GST / HST / PST / QST";
            case "US" -> "sales tax / use tax";
            case "CO" -> "IVA / impuesto nacional al consumo";
            case "BR" -> "ICMS / ISS / IPI / PIS / Cofins; CBS / IBS según vigencia";
            default -> "impuestos indirectos según jurisdicción";
        };
    }
    FinancialStatement present(FinancialStatement statement) {
        var lines = statement.lines().stream().map(line -> {
            var label = switch (line.code()) {
                case "INCOME_TAX" -> incomeTax();
                case "TAXES_PAYABLE" -> "Impuestos por pagar (" + indirectTaxNames() + ")";
                case "FINANCE_EXPENSE" -> "Resultado financiero (costo neto)";
                default -> line.label();
            };
            return new StatementLine(line.code(), label, line.level(), line.subtotal(), line.current(),
                line.comparative(), line.variance(), line.variancePercent(), line.tone());
        }).toList();
        return new FinancialStatement(statement.id(), statement.title(), statement.subtitle(),
            standard(statement.id()), lines, statement.internallyConsistent());
    }
    private String standard(String statement) {
        if (framework.startsWith("IFRS_SMES_")) {
            var section = switch (statement) {
                case "profit-loss" -> "5";
                case "financial-position" -> "4";
                case "cash-flow" -> "7";
                default -> "6";
            };
            return "IFRS for SMEs " + framework.substring("IFRS_SMES_".length()) + " §" + section;
        }
        return "cash-flow".equals(statement) ? "IAS 7"
            : "FULL_IFRS_18".equals(framework) ? "IFRS 18" : "IAS 1";
    }
    List<String> notes() {
        return List.of(
            "Estados genéricos de apoyo a decisiones, basados en " + framework.replace('_', ' ')
                + ". La presentación no constituye una declaración de cumplimiento integral de NIIF ni una declaración fiscal.",
            "La moneda funcional permanece fija para el mayor. La preferencia de visualización de KPIs no modifica operaciones ni asientos publicados.",
            "País de referencia: " + (country.isEmpty() ? "sin configurar" : country)
                + ". Nombres fiscales orientativos: " + indirectTaxNames()
                + ". La operación determina impuesto, jurisdicción, recuperabilidad y vigencia; no se calculan tasas a partir de la moneda.",
            "Los impuestos sin desglose verificable conservan su clasificación de origen; los nombres no reclasifican saldos históricos.",
            "Los impuestos de compras pendientes de clasificación requieren revisión de recuperabilidad y soporte antes de presentarlos como crédito fiscal.",
            "Las diferencias de cambio realizadas se presentan en el resultado financiero neto. La reexpresión de saldos monetarios al cierre requiere un ajuste documentado con la política aplicable.",
            "Los intereses de Cartera se distinguen del principal al cobrar. Los devengos e interés efectivo que requiera la entidad se incorporan mediante ajustes contables documentados.",
            "El informe refleja las fuentes contabilizadas y los controles de cobertura indicados. Requiere revisión de aperturas, estimaciones, políticas y notas de la entidad."
        );
    }
}
