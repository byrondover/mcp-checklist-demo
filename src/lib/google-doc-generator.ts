import { LessonEntity } from "../types/api-types";
import { Border } from "../components/printables/selects/select-border";
import { YesNo } from "../hooks/use-checklist-options";

const BORDER_IMAGE_URL = "https://i.imgur.com/YO0ENlB.png";

const STATUS_COLORS: any = {
  MUST_DO: { red: 0.04, green: 0.32, blue: 0.58 },
  SHOULD_DO: { red: 0.96, green: 0.62, blue: 0.04 },
  ASPIRE_TO_DO: { red: 0.84, green: 0.69, blue: 0.0 },
  DEFAULT: { red: 0.2, green: 0.2, blue: 0.2 },
};

export interface DocGenerationData {
  courseName: string;
  sectionName: string;
  unitName: string;
  borderVariant: Border;
  includeClassName: YesNo;
  courseClassName: string;
}

export interface TableGenerationSettings {
  includeVideoHyperlinks: YesNo;
  teacherSignOff: YesNo;
}

export function generateHeaderRequests(data: DocGenerationData): any[] {
  const requests: any[] = [];
  let currentIndex = 1;

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
          color: { rgbColor: { red: 0.06, green: 0.33, blue: 0.56 } },
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
      textStyle: { italic: true, fontSize: { magnitude: 10, unit: "PT" } },
      fields: "italic,fontSize",
    },
  });
  currentIndex += subTitleText.length;

  // 3. FORM FIELDS
  const headerText = `Name: _______________________________   Date: ______________   Class: ${
    data.includeClassName === YesNo.YES
      ? data.courseClassName
      : "______________"
  }\n\n`;
  requests.push({
    insertText: { text: headerText, location: { index: currentIndex } },
  });
  currentIndex += headerText.length;

  return requests;
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
          columnIndex: 0,
        },
        rowSpan: 1,
        columnSpan: 3,
      },
    },
  });

  if (lesson.activities.length > 0) {
    requests.push({
      mergeTableCells: {
        tableRange: {
          tableCellLocation: {
            tableStartLocation: { index: tableStartIndex },
            rowIndex: 2,
            columnIndex: 0,
          },
          rowSpan: lesson.activities.length,
          columnSpan: 1,
        },
      },
    });
  }

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
        width: { magnitude: 80, unit: "PT" },
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
        width: { magnitude: 300, unit: "PT" },
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
    text: lesson.learningTarget
      ? `Learning Goal: ${lesson.learningTarget}`
      : "Learning Goal",
    style: { italic: true, fontSize: { magnitude: 9, unit: "PT" } },
  });

  lesson.activities.forEach((activity, i) => {
    const rowIndex = i + 2;

    if (i === 0) {
      operations.push({
        index: getCellIndex(rowIndex, 0) + 1,
        text: "🗓️ Date:\n______",
        style: { fontSize: { magnitude: 9, unit: "PT" } },
      });
    }

    let activityText = activity.name;
    if (activity.classification === "ASPIRE_TO_DO") {
      activityText += " ⭐";
    }

    let linkUrl = undefined;
    if (settings.includeVideoHyperlinks === YesNo.YES) {
      if (activity.type === "VIDEO_AND_NOTES" || activity.resources?.[0]?.url) {
        linkUrl =
          activity.resources?.[0]?.url || "https://modernclassrooms.org";
      }
    }

    operations.push({
      index: getCellIndex(rowIndex, 1) + 1,
      text: activityText,
      link: linkUrl,
      isCheckbox: true,
    });

    const rawStatus = activity.classification || "MUST_DO";
    const statusText = rawStatus
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const statusColor = STATUS_COLORS[rawStatus] || STATUS_COLORS.DEFAULT;

    operations.push({
      index: getCellIndex(rowIndex, 2) + 1,
      text: statusText,
      style: {
        bold: true,
        fontSize: { magnitude: 8, unit: "PT" },
        foregroundColor: { color: { rgbColor: statusColor } },
      },
    });
  });

  if (settings.teacherSignOff === YesNo.YES) {
    operations.push({
      index: getCellIndex(totalRows - 1, 0) + 1,
      text: "Teacher Sign Off: ___________________",
      style: {
        bold: true,
        fontSize: { magnitude: 10, unit: "PT" },
        foregroundColor: {
          color: { rgbColor: { red: 0.13, green: 0.69, blue: 0.3 } },
        },
      },
      isCheckbox: true,
    });
  }

  operations.sort((a, b) => b.index - a.index);

  operations.forEach((op) => {
    requests.push({
      insertText: { text: op.text, location: { index: op.index } },
    });

    if (op.style || op.link) {
      const style: any = { ...op.style };
      if (op.link) {
        style.link = { url: op.link };
        style.foregroundColor = {
          color: { rgbColor: { red: 0.1, green: 0.3, blue: 0.8 } },
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
): any[] {
  return [
    {
      insertInlineImage: {
        uri: BORDER_IMAGE_URL,
        endOfSegmentLocation: { segmentId: footerId },
        objectSize: { width: { magnitude: 450, unit: "PT" } },
      },
    },
    {
        updateParagraphStyle: {
            paragraphStyle: { alignment: "CENTER" },
            range: { segmentId: footerId, startIndex: 0, endIndex: 1 },
            fields: "alignment"
        }
    }
  ];
}
