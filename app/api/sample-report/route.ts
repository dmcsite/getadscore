import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function GET() {
  // Sample data for GlowSkin Vitamin C Serum ad
  const sampleData = {
    brandName: "GlowSkin",
    overallScore: 72,
    verdict: "READY TO TEST",
    analyzedAt: new Date().toISOString(),
    executiveSummary: {
      biggestStrength: "Strong before/after visual with clear product benefit",
      biggestRisk: "No social proof or trust signals visible",
      quickWin: "Add star rating or '10,000+ happy customers' badge",
    },
    categories: [
      { name: "Thumb-Stop Power", score: 8, reason: "High contrast before/after split creates immediate visual interest" },
      { name: "Hook Clarity", score: 7, reason: "Value prop is clear - brighter skin - but takes 2 seconds to register" },
      { name: "Text Legibility", score: 6, reason: "Headline readable but product name font is too small on mobile" },
      { name: "Social Proof", score: 3, reason: "No reviews, ratings, or customer count visible anywhere" },
      { name: "Product Visibility", score: 8, reason: "Serum bottle prominently displayed with clear branding" },
      { name: "CTA Strength", score: 7, reason: "'Shop Now' button present but could use urgency" },
      { name: "Emotional Trigger", score: 8, reason: "Transformation appeal is strong - desire for clear skin" },
      { name: "Platform Nativity", score: 6, reason: "Slightly too polished - could feel more organic/UGC" },
    ],
    topFixes: [
      "Add social proof: Include '4.8 stars from 2,847 reviews' near the product",
      "Increase product name font size by 30% for mobile readability",
      "Add urgency to CTA: Change 'Shop Now' to 'Get 20% Off Today'",
      "Consider a more native feel: Use customer selfie instead of studio shot",
      "Add trust badge: 'Dermatologist Tested' or 'Clean Beauty Certified'",
    ],
    whatsWorking: "The before/after visual immediately communicates the product benefit without needing to read. The serum bottle is well-lit and professionally shot, building perceived quality. The transformation shown is believable (not too dramatic) which avoids policy flags.",
    verdictReason: "This ad has strong fundamentals - clear benefit, good product visibility, and emotional appeal. The missing social proof is the main gap preventing it from being scale-ready.",
    policyFlags: [],
    quickAudit: {
      offerMentioned: true,
      urgencyPresent: false,
    },
  };

  // Generate PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const brandPurple: [number, number, number] = [99, 102, 241];
  const brandGreen: [number, number, number] = [34, 197, 94];
  const brandRed: [number, number, number] = [239, 68, 68];
  const textDark: [number, number, number] = [39, 39, 42];
  const textMuted: [number, number, number] = [113, 113, 122];
  const bgLight: [number, number, number] = [250, 250, 250];

  // Helper functions
  const getScoreColor = (score: number): [number, number, number] => {
    if (score >= 80) return brandGreen;
    if (score >= 60) return [234, 179, 8];
    if (score >= 40) return [249, 115, 22];
    return brandRed;
  };

  const getCategoryScoreColor = (score: number): [number, number, number] => {
    if (score >= 7) return brandGreen;
    if (score >= 5) return [234, 179, 8];
    return brandRed;
  };

  const addPageBreakIfNeeded = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Header with gradient bar
  pdf.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  pdf.rect(0, 0, pageWidth, 25, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("GetAdScore", margin, 12);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Ad Creative Analysis Report", margin, 19);

  pdf.setFontSize(9);
  pdf.text("SAMPLE REPORT", pageWidth - margin - 28, 12);

  yPos = 35;

  // Brand name and date
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${sampleData.brandName} - Vitamin C Serum Ad`, margin, yPos);

  yPos += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.text(`Analysis Date: ${new Date().toLocaleDateString()}`, margin, yPos);

  yPos += 15;

  // Score section
  const scoreColor = getScoreColor(sampleData.overallScore);
  pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdf.roundedRect(margin, yPos, contentWidth, 35, 3, 3, "F");

  pdf.setFontSize(36);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  pdf.text(`${sampleData.overallScore}`, margin + 15, yPos + 22);

  pdf.setFontSize(14);
  pdf.text("/100", margin + 38, yPos + 22);

  pdf.setFontSize(16);
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text(sampleData.verdict, margin + 65, yPos + 15);

  pdf.setFontSize(9);
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const verdictLines = pdf.splitTextToSize(sampleData.verdictReason, contentWidth - 70);
  pdf.text(verdictLines.slice(0, 2), margin + 65, yPos + 23);

  yPos += 45;

  // Executive Summary
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text("Executive Summary", margin, yPos);

  yPos += 8;

  const summaryItems = [
    { label: "STRENGTH", text: sampleData.executiveSummary.biggestStrength, color: brandGreen },
    { label: "RISK", text: sampleData.executiveSummary.biggestRisk, color: brandRed },
    { label: "QUICK WIN", text: sampleData.executiveSummary.quickWin, color: brandPurple },
  ];

  const colWidth = (contentWidth - 10) / 3;
  summaryItems.forEach((item, i) => {
    const xPos = margin + i * (colWidth + 5);

    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.roundedRect(xPos, yPos, colWidth, 28, 2, 2, "F");

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
    pdf.text(item.label, xPos + 4, yPos + 6);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
    const lines = pdf.splitTextToSize(item.text, colWidth - 8);
    pdf.text(lines.slice(0, 3), xPos + 4, yPos + 12);
  });

  yPos += 38;

  // Category Scores
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text("Category Scores", margin, yPos);

  yPos += 8;

  sampleData.categories.forEach((cat, i) => {
    if (i > 0 && i % 4 === 0) {
      yPos += 2;
    }

    addPageBreakIfNeeded(12);

    const catScoreColor = getCategoryScoreColor(cat.score);

    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.roundedRect(margin, yPos, contentWidth, 10, 1, 1, "F");

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
    pdf.text(cat.name, margin + 4, yPos + 6.5);

    pdf.setTextColor(catScoreColor[0], catScoreColor[1], catScoreColor[2]);
    pdf.text(`${cat.score}/10`, margin + 50, yPos + 6.5);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.setFontSize(8);
    const reasonText = pdf.splitTextToSize(cat.reason, contentWidth - 70);
    pdf.text(reasonText[0], margin + 65, yPos + 6.5);

    yPos += 12;
  });

  yPos += 8;

  // Top Fixes
  addPageBreakIfNeeded(60);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text("Top Fixes", margin, yPos);

  yPos += 8;

  sampleData.topFixes.forEach((fix, i) => {
    addPageBreakIfNeeded(15);

    pdf.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
    pdf.circle(margin + 3, yPos + 2, 2.5, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${i + 1}`, margin + 1.8, yPos + 3.5);

    pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const fixLines = pdf.splitTextToSize(fix, contentWidth - 15);
    pdf.text(fixLines, margin + 10, yPos + 3);

    yPos += fixLines.length * 4 + 6;
  });

  yPos += 8;

  // What's Working
  addPageBreakIfNeeded(40);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text("What's Working", margin, yPos);

  yPos += 6;

  pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
  pdf.setDrawColor(brandGreen[0], brandGreen[1], brandGreen[2]);
  pdf.roundedRect(margin, yPos, contentWidth, 1, 0, 0, "F");

  yPos += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const workingLines = pdf.splitTextToSize(sampleData.whatsWorking, contentWidth);
  pdf.text(workingLines, margin, yPos);

  yPos += workingLines.length * 4 + 10;

  // Quick Audit
  addPageBreakIfNeeded(25);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
  pdf.text("Quick Audit", margin, yPos);

  yPos += 8;

  const auditItems = [
    { label: "Offer Mentioned", value: sampleData.quickAudit.offerMentioned },
    { label: "Urgency Present", value: sampleData.quickAudit.urgencyPresent },
  ];

  auditItems.forEach((item, i) => {
    const xPos = margin + i * 50;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    pdf.text(item.label + ":", xPos, yPos);

    const statusColor = item.value ? brandGreen : brandRed;
    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text(item.value ? "Yes" : "No", xPos + 28, yPos);
  });

  // Footer
  const footerY = pageHeight - 10;
  pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdf.rect(0, footerY - 5, pageWidth, 15, "F");

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  pdf.text("Generated by GetAdScore.com", margin, footerY);
  pdf.text("This is a sample report", pageWidth - margin - 35, footerY);

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=getadscore-sample-report.pdf",
    },
  });
}
