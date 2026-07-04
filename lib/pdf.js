import { jsPDF } from "jspdf";

const ORANGE = [245, 166, 35];
const DARK = [15, 15, 20];
const GRAY = [90, 90, 100];

/**
 * Builds a professional single/multi-page PDF report from a research result
 * and returns { doc, blob, dataUri } so callers can download it and/or
 * ship it to Discord.
 */
export function buildResearchPdf(result) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 0;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 100, "F");
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(3);
  doc.line(0, 100, pageWidth, 100);

  doc.setTextColor(...ORANGE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RELU CONSULTANCY · COMPANY RESEARCH REPORT", margin, 40);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(result.companyName || "Unknown Company", margin, 72);

  y = 140;

  const sectionTitle = (title) => {
    doc.setTextColor(...ORANGE);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 26;
  };

  const keyValue = (label, value) => {
    doc.setTextColor(...GRAY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || "Not publicly listed"), margin + 110, y);
    y += 18;
  };

  const bullet = (text) => {
    const lines = doc.splitTextToSize(`•  ${text}`, pageWidth - margin * 2 - 10);
    checkPageBreak(lines.length * 14);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 6;
  };

  const checkPageBreak = (needed) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Company info
  sectionTitle("Company Information");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  keyValue("Website", result.website);
  keyValue("Phone", result.phone);
  keyValue("Address", result.address);
  y += 6;

  // Products/services
  sectionTitle("Products & Services");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  if (result.productsServices?.length) {
    result.productsServices.forEach((p) => bullet(p));
  } else {
    bullet("Not available");
  }
  y += 4;

  // Summary
  if (result.summary) {
    checkPageBreak(60);
    sectionTitle("AI-Generated Company Summary");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(result.summary, pageWidth - margin * 2);
    checkPageBreak(lines.length * 14);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 10;
  }

  // Pain points
  checkPageBreak(60);
  sectionTitle("AI-Generated Pain Points");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  if (result.painPoints?.length) {
    result.painPoints.forEach((p) => bullet(p));
  } else {
    bullet("Not available");
  }
  y += 4;

  // Competitors
  checkPageBreak(60);
  sectionTitle("Competitors");
  doc.setFontSize(10);
  if (result.competitors?.length) {
    result.competitors.forEach((c) => {
      checkPageBreak(18);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(c.name, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(c.website || "", margin + 160, y);
      y += 18;
    });
  } else {
    bullet("Not available");
  }

  const fileName = `${(result.companyName || "company").replace(/\s+/g, "-").toLowerCase()}-research-report.pdf`;
  const dataUri = doc.output("datauristring");
  const blob = doc.output("blob");

  return { doc, blob, dataUri, fileName };
}
