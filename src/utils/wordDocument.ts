import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import mammoth from 'mammoth';
import { KnowledgeArticle } from '../types';

/**
 * Parses an uploaded .docx file in the browser using Mammoth.
 * Extracts rich HTML structure, tables, and raw text.
 */
export async function importDocxFile(file: File): Promise<{
  fileName: string;
  html: string;
  rawText: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const textResult = await mammoth.extractRawText({ arrayBuffer });

  return {
    fileName: file.name,
    html: htmlResult.value,
    rawText: textResult.value,
  };
}

/**
 * Generates an authentic Microsoft Word (.docx) file for the given article
 * with enterprise Instacart formatting, metadata tables, callouts, and footers.
 */
export async function exportArticleToDocx(article: KnowledgeArticle): Promise<void> {
  const doc = new Document({
    creator: 'Mazen Tharwat',
    title: article.title,
    description: article.summary,
    sections: [
      {
        properties: {},
        children: [
          // Header Kicker
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'INSTACART CARE CX · ENTERPRISE LOGISTICS MANUAL',
                bold: true,
                size: 18,
                color: '10B981',
              }),
            ],
          }),

          // Document Title
          new Paragraph({
            text: article.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 150 },
          }),

          // Classification & Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'SOP Document ID:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph(article.articleId)],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Category:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph(article.category)],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Classification:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph(article.classification || 'CONFIDENTIAL · INSTACART CARE SOP')],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Document Version:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph(article.docVersion || 'v3.2 Enterprise Edition')],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Platform Creator:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph('Mazen Tharwat')],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Status:', bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph('Active · Certified Operational Procedure')],
                  }),
                ],
              }),
            ],
          }),

          // Section 1: Executive Summary
          new Paragraph({
            text: '1. Executive Policy Summary',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: article.summary,
                italics: true,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Section 2: Standard Operating Procedure
          new Paragraph({
            text: '2. Standard Operating Procedure (SOP)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          ...article.content
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .map((line) => {
              return new Paragraph({
                text: line,
                spacing: { after: 120 },
              });
            }),

          // Section 3: Agent Recommended Action & Case Note Snippet
          new Paragraph({
            text: '3. Quick Action & Standard Case Note Snippet',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `[Recommended Case Note Entry]: ${article.recommendedSop}`,
                bold: true,
                color: '047857',
              }),
            ],
            spacing: { after: 300 },
          }),

          // Footer disclaimer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'simple&easy Enterprise System · Compliant with USDA/FDA Food Safety Modernization Act',
                size: 16,
                color: '6B7280',
              }),
            ],
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = article.title.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
  a.download = `${article.articleId}_${cleanTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Built-in High-Definition Visual Banner Diagrams for Instacart Logistics SOPs
 */
export const LOGISTICS_BANNER_DIAGRAMS: Record<
  string,
  {
    bannerUrl: string;
    caption: string;
    badgeText: string;
  }
> = {
  'KB-INSTA-101': {
    bannerUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Cold Chain Temperature Matrix: Refrigerated Produce (<40°F / 4°C) · Frozen Meat & Gelato (<0°F / -18°C) · Transit Limits: 30 Min Thermal Insulated Max.',
    badgeText: 'FDA / USDA Food Safety Standard Compliance',
  },
  'KB-INSTA-102': {
    bannerUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Driver Fleet Dispatch & Active Batch Relinquishment: Emergency Unassign · Split Multi-Order Cart · Hotshot Fleet Re-Routing Flow.',
    badgeText: 'Fleet Operations Emergency Protocol',
  },
  'KB-INSTA-103': {
    bannerUrl:
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Shopper Tip Protection Verification: On-Time Delivery Check · Item Accuracy Scan · Zero-Complaint Validation · Max $10 Guarantee Reimbursement.',
    badgeText: 'Shopper Trust & Tip Protection Tier-1',
  },
  'KB-INSTA-104': {
    bannerUrl:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Damaged & Missing Grocery Claims Matrix: Checkout Receipt Barcode Match · Damaged Egg/Dairy Immediate Credit · Dinner Disruption Courtesy Voucher.',
    badgeText: 'Customer Instant Restitution SLA',
  },
  'KB-INSTA-105': {
    bannerUrl:
      'https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Retail Partner Curbside Staging Handover: Costco, ALDI & Kroger Staging Freezers · Bay Coordinates · Target Handover <4 Minutes.',
    badgeText: 'Retail Partner Handover SLA',
  },
  'KB-INSTA-106': {
    bannerUrl:
      'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=1200&q=80',
    caption:
      'Shopper Identity & Driver Verification: Name, Phone Last-4, Registered Hub City, and Last Batch Store Name Authentication.',
    badgeText: 'Driver CTI Authentication Protocol',
  },
};
