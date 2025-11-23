import { LessonEntity } from "../types/api-types";
import { Border } from "../components/printables/selects/select-border";
import { Color } from "../components/printables/selects/select-color";
import { YesNo } from "../hooks/use-checklist-options";

const BORDER_URL_MAP: Record<string, string> = {
  [Border.BORDER_1]:
    "https://res.cloudinary.com/dgixwid5g/image/upload/v1763829060/border-1_tpjndr.png",
  [Border.BORDER_2]:
    "https://res.cloudinary.com/dgixwid5g/image/upload/v1763829100/border-2_ojxjr3.png",
  [Border.BORDER_3]:
    "https://res.cloudinary.com/dgixwid5g/image/upload/v1763829122/border-3_l6jm4h.png",
  [Border.BORDER_4]:
    "https://res.cloudinary.com/dgixwid5g/image/upload/v1763829149/border-4_shvqha.png",
};

const STATUS_COLORS: any = {
  MUST_DO: { red: 0.04, green: 0.32, blue: 0.58 },
  SHOULD_DO: { red: 0.96, green: 0.62, blue: 0.04 },
  ASPIRE_TO_DO: { red: 0.84, green: 0.69, blue: 0.0 },
  DEFAULT: { red: 0.2, green: 0.2, blue: 0.2 },
};

const BRAND_BLUE = { red: 0.06, green: 0.33, blue: 0.56 };
const BLACK = { red: 0, green: 0, blue: 0 };

const PAGE_HEIGHT = 792;
const PAGE_MARGIN_TOP = 36;
const PAGE_MARGIN_BOTTOM = 36;
const AVAILABLE_PAGE_HEIGHT =
  PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;

const HEADER_HEIGHT = 100;
const ROW_HEIGHT = 30;
const TABLE_PADDING = 20;
const SPACING_BETWEEN_TABLES = 15;

export interface DocGenerationData {
  courseName: string;
  sectionName: string;
  unitName: string;
  borderVariant: Border;
  includeClassName: YesNo;
  courseClassName: string;
  colorTheme: Color;
}

export interface TableGenerationSettings {
  includeVideoHyperlinks: YesNo;
  teacherSignOff: YesNo;
  colorTheme: Color;
}

export function estimateTableHeight(
  lesson: LessonEntity,
  teacherSignOff: YesNo
): number {
  const footerRow = teacherSignOff === YesNo.YES ? 1 : 0;
  const totalRows = 2 + (lesson.activities?.length || 0) + footerRow;
  return totalRows * ROW_HEIGHT + TABLE_PADDING;
}

export function shouldInsertPageBreak(
  currentPageHeight: number,
  tableHeight: number,
  isFirstTable: boolean
): boolean {
  if (isFirstTable) {
    return false;
  }

  return currentPageHeight + tableHeight > AVAILABLE_PAGE_HEIGHT;
}

export class PageTracker {
  private currentHeight: number;

  constructor() {
    this.currentHeight = HEADER_HEIGHT;
  }

  addTable(tableHeight: number): void {
    this.currentHeight += tableHeight + SPACING_BETWEEN_TABLES;
  }

  resetPage(): void {
    this.currentHeight = 0;
  }

  getCurrentHeight(): number {
    return this.currentHeight;
  }
}

export function generateDocumentStyleRequest(): any {
  return {
    updateDocumentStyle: {
      documentStyle: {
        marginTop: { magnitude: 36, unit: "PT" },
        marginBottom: { magnitude: 36, unit: "PT" },
        marginLeft: { magnitude: 36, unit: "PT" },
        marginRight: { magnitude: 36, unit: "PT" },
      },
      fields: "marginTop,marginBottom,marginLeft,marginRight",
    },
  };
}

export function generateHeaderRequests(data: DocGenerationData): any[] {
  const requests: any[] = [];
  let currentIndex = 1;

  const titleColor =
    data.colorTheme === Color.BLACK_AND_WHITE ? BLACK : BRAND_BLUE;
  const subtitleColor =
    data.colorTheme === Color.BLACK_AND_WHITE ? BLACK : BRAND_BLUE;

  const mainTitleText = `${data.sectionName}\n`;
  requests.push({
    insertText: { text: mainTitleText, location: { index: currentIndex } },
  });
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + mainTitleText.length,
      },
      textStyle: {
        bold: true,
        fontSize: { magnitude: 16, unit: "PT" },
        foregroundColor: {
          color: { rgbColor: titleColor },
        },
      },
      fields: "bold,fontSize,foregroundColor",
    },
  });
  currentIndex += mainTitleText.length;

  // 2. SUBTITLE
  const subTitleText = `${data.courseName} / ${data.unitName}\n\n`;
  requests.push({
    insertText: { text: subTitleText, location: { index: currentIndex } },
  });
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + subTitleText.length,
      },
      textStyle: {
        italic: true,
        fontSize: { magnitude: 10, unit: "PT" },
        foregroundColor: { color: { rgbColor: subtitleColor } },
      },
      fields: "italic,fontSize,foregroundColor",
    },
  });
  currentIndex += subTitleText.length;

  // 3. FORM FIELDS
  const classNameText =
    data.includeClassName === YesNo.YES
      ? data.courseClassName
      : "______________";
  const headerText = `Name: _______________________________   Date: ______________   Class: ${classNameText}\n\n`;
  requests.push({
    insertText: { text: headerText, location: { index: currentIndex } },
  });

  if (
    data.includeClassName === YesNo.YES &&
    data.colorTheme !== Color.BLACK_AND_WHITE
  ) {
    const classStart = currentIndex + headerText.indexOf(data.courseClassName);
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: classStart,
          endIndex: classStart + data.courseClassName.length,
        },
        textStyle: { foregroundColor: { color: { rgbColor: BRAND_BLUE } } },
        fields: "foregroundColor",
      },
    });
  }

  return requests;
}

export function generatePageBreakRequest(): any {
  return {
    insertPageBreak: {
      endOfSegmentLocation: { segmentId: "" },
    },
  };
}

export function generateEmptyTableRequest(
  lesson: LessonEntity,
  teacherSignOff: YesNo
): any {
  const footerRow = teacherSignOff === YesNo.YES ? 1 : 0;
  const totalRows = 2 + (lesson.activities?.length || 0) + footerRow;

  return {
    insertTable: {
      rows: totalRows,
      columns: 3,
      endOfSegmentLocation: { segmentId: "" },
    },
  };
}

export function generateTableContentRequests(
  lesson: LessonEntity,
  tableStartIndex: number,
  tableRowData: any[],
  settings: TableGenerationSettings
): any[] {
  const requests: any[] = [];
  const footerRow = settings.teacherSignOff === YesNo.YES ? 1 : 0;
  const totalRows = 2 + (lesson.activities?.length || 0) + footerRow;

  const greyColor = {
    color: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } },
  };

  const getCellIndex = (row: number, col: number) => {
    if (!tableRowData[row] || !tableRowData[row].tableCells[col])
      return tableStartIndex;
    return tableRowData[row].tableCells[col].startIndex;
  };

  requests.push({
    mergeTableCells: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: { index: tableStartIndex },
          rowIndex: 0,
          columnIndex: 0,
        },
        rowSpan: 1,
        columnSpan: 3,
      },
    },
  });

  requests.push({
    mergeTableCells: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: { index: tableStartIndex },
          rowIndex: 1,
          columnIndex: 1,
        },
        rowSpan: 1,
        columnSpan: 2,
      },
    },
  });

  if (settings.teacherSignOff === YesNo.YES) {
    requests.push({
      mergeTableCells: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStartIndex },
            rowIndex: totalRows - 1,
            columnIndex: 0,
          },
          rowSpan: 1,
          columnSpan: 3,
        },
      },
    });
  }

  requests.push({
    updateTableColumnProperties: {
      tableStartLocation: { index: tableStartIndex },
      columnIndices: [0],
      tableColumnProperties: {
        widthType: "FIXED_WIDTH",
        width: { magnitude: 72, unit: "PT" },
      },
      fields: "width,widthType",
    },
  });
  requests.push({
    updateTableColumnProperties: {
      tableStartLocation: { index: tableStartIndex },
      columnIndices: [2],
      tableColumnProperties: {
        widthType: "FIXED_WIDTH",
        width: { magnitude: 108, unit: "PT" },
      },
      fields: "width,widthType",
    },
  });

  requests.push({
    updateTableColumnProperties: {
      tableStartLocation: { index: tableStartIndex },
      columnIndices: [1],
      tableColumnProperties: {
        widthType: "FIXED_WIDTH",
        width: { magnitude: 360, unit: "PT" },
      },
      fields: "width,widthType",
    },
  });

  requests.push({
    updateTableCellStyle: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: { index: tableStartIndex },
          rowIndex: 0,
          columnIndex: 0,
        },
        rowSpan: 1,
        columnSpan: 3,
      },
      tableCellStyle: { backgroundColor: greyColor },
      fields: "backgroundColor",
    },
  });

  const operations: any[] = [];

  operations.push({
    index: getCellIndex(0, 0) + 1,
    text: lesson.name,
    style: { bold: true, fontSize: { magnitude: 11, unit: "PT" } },
  });

  operations.push({
    index: getCellIndex(1, 0) + 1,
    text: "Due Date",
    style: { fontSize: { magnitude: 11, unit: "PT" } },
  });

  operations.push({
    index: getCellIndex(1, 1) + 1,
    text: lesson.learningTarget
      ? `Learning Goal: ${lesson.learningTarget}`
      : "Learning Goal",
    style: { italic: true, fontSize: { magnitude: 9, unit: "PT" } },
  });

  lesson.activities.forEach((activity, i) => {
    const rowIndex = i + 2;

    const rawDate = activity.classActivities?.[0]?.dueDate;
    let dateText = "";
    if (rawDate) {
      const d = new Date(rawDate);
      const month = d.toLocaleString("default", { month: "short" });
      const day = d.getDate();
      dateText = "🗓️ ";
      dateText += `${month} ${day}`;
    }

    operations.push({
      index: getCellIndex(rowIndex, 0) + 1,
      text: dateText,
      style: { fontSize: { magnitude: 10, unit: "PT" } },
    });

    let activityText = activity.name;
    if (activity.classification === "ASPIRE_TO_DO") {
      const starIcon =
        settings.colorTheme === Color.BLACK_AND_WHITE ? " ★" : " ⭐";
      activityText += starIcon;
    }

    let linkUrl = undefined;
    if (settings.includeVideoHyperlinks === YesNo.YES) {
      if (activity.type === "VIDEO_AND_NOTES" || activity.resources?.[0]?.url) {
        linkUrl =
          activity.resources?.[0]?.url || "https://modernclassrooms.org";
      }
    }

    const linkColor =
      settings.colorTheme === Color.BLACK_AND_WHITE
        ? BLACK
        : { red: 0.1, green: 0.3, blue: 0.8 };

    operations.push({
      index: getCellIndex(rowIndex, 1) + 1,
      text: activityText,
      link: linkUrl,
      linkColor: linkColor,
      isCheckbox: true,
    });

    const rawStatus = activity.classification || "MUST_DO";
    const statusText = rawStatus
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const statusColorDef =
      settings.colorTheme === Color.BLACK_AND_WHITE
        ? BLACK
        : STATUS_COLORS[rawStatus] || STATUS_COLORS.DEFAULT;

    operations.push({
      index: getCellIndex(rowIndex, 2) + 1,
      text: statusText,
      style: {
        bold: true,
        fontSize: { magnitude: 10, unit: "PT" },
        foregroundColor: { color: { rgbColor: statusColorDef } },
      },
      alignment: "CENTER",
    });
  });

  if (settings.teacherSignOff === YesNo.YES) {
    const teacherSignOffColor =
      settings.colorTheme === Color.BLACK_AND_WHITE
        ? BLACK
        : { red: 0.13, green: 0.69, blue: 0.3 };
    operations.push({
      index: getCellIndex(totalRows - 1, 0) + 1,
      text: "Teacher Sign Off",
      style: {
        bold: true,
        fontSize: { magnitude: 10, unit: "PT" },
        foregroundColor: {
          color: { rgbColor: teacherSignOffColor },
        },
      },
      isCheckbox: true,
    });
  }

  operations.sort((a, b) => b.index - a.index);

  operations.forEach((op) => {
    if (!op.text || op.text.length === 0) {
      return;
    }

    requests.push({
      insertText: { text: op.text, location: { index: op.index } },
    });

    if (op.style || op.link) {
      const style: any = { ...op.style };
      if (op.link) {
        style.link = { url: op.link };
        style.foregroundColor = {
          color: {
            rgbColor: op.linkColor || { red: 0.1, green: 0.3, blue: 0.8 },
          },
        };
        style.underline = true;
      }
      requests.push({
        updateTextStyle: {
          range: { startIndex: op.index, endIndex: op.index + op.text.length },
          textStyle: style,
          fields: Object.keys(style).join(","),
        },
      });
    }

    if (op.isCheckbox) {
      requests.push({
        createParagraphBullets: {
          range: { startIndex: op.index, endIndex: op.index + 1 },
          bulletPreset: "BULLET_CHECKBOX",
        },
      });
    }

    if (op.alignment) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: op.index, endIndex: op.index + 1 },
          paragraphStyle: { alignment: op.alignment },
          fields: "alignment",
        },
      });
    }
  });

  return requests;
}

export function generateCreateFooterRequest(): any {
  return {
    createFooter: {
      type: "DEFAULT",
    },
  };
}

export function generateFooterContentRequest(
  footerId: string,
  borderVariant: Border,
  colorTheme: Color
): any[] {
  let selectedBorderUrl =
    BORDER_URL_MAP[borderVariant] || BORDER_URL_MAP[Border.BORDER_1];

  if (colorTheme === Color.BLACK_AND_WHITE) {
    selectedBorderUrl = selectedBorderUrl.replace(
      "/upload/",
      "/upload/e_grayscale/"
    );
  }

  return [
    {
      insertInlineImage: {
        uri: selectedBorderUrl,
        endOfSegmentLocation: { segmentId: footerId },
        objectSize: { width: { magnitude: 450, unit: "PT" } },
      },
    },
    {
      updateParagraphStyle: {
        paragraphStyle: { alignment: "CENTER" },
        range: { segmentId: footerId, startIndex: 0, endIndex: 1 },
        fields: "alignment",
      },
    },
  ];
}
