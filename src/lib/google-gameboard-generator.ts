import { LessonEntity, ActivityEntity } from "../types/api-types";
import { Color } from "../components/printables/selects/select-color";
import { LessonDivider } from "../components/printables/selects/select-lesson-divider";
import { GraphicTheme } from "../components/printables/selects/select-graphic-theme";
import { YesNo } from "../hooks/use-checklist-options";
import { UserSetting } from "../types/user-settings";
import { hexToDocsRgbColor } from "./utils";

export type DocsRequest = gapi.client.docs.Request;

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const PAGE_MARGIN = 40;
const SQUARE_SIZE = 96;
const SQUARES_PER_ROW = 7;

const BRAND_BLUE: gapi.client.docs.RgbColor = {
  red: 0.04,
  green: 0.32,
  blue: 0.58,
};
const BLACK: gapi.client.docs.RgbColor = { red: 0, green: 0, blue: 0 };
const GOLD: gapi.client.docs.RgbColor = { red: 0.98, green: 0.75, blue: 0.14 };
const GREY_TEXT: gapi.client.docs.RgbColor = {
  red: 0.39,
  green: 0.45,
  blue: 0.55,
};
const TRANSPARENT: gapi.client.docs.RgbColor = { red: 1, green: 1, blue: 1 };
const LIGHT_GREY: gapi.client.docs.RgbColor = {
  red: 0.9,
  green: 0.9,
  blue: 0.9,
};

const LESSON_COLORS = [
  {
    backgroundColor: { red: 0.96, green: 1.0, blue: 0.85 },
    textColor: { red: 0.55, green: 0.74, blue: 0.05 },
  },
  {
    backgroundColor: { red: 1.0, green: 0.93, blue: 0.9 },
    textColor: { red: 0.93, green: 0.35, blue: 0.22 },
  },
  {
    backgroundColor: { red: 0.93, green: 1.0, blue: 1.0 },
    textColor: { red: 0.12, green: 0.59, blue: 0.63 },
  },
  {
    backgroundColor: { red: 1.0, green: 0.95, blue: 0.89 },
    textColor: { red: 0.98, green: 0.65, blue: 0.22 },
  },
];

const GRAPHIC_EMOJIS: Record<GraphicTheme, string[]> = {
  [GraphicTheme.NATURE]: ["🌿", "🌸", "🍃", "🌻", "🌺", "🌼", "🌷", "🌴"],
  [GraphicTheme.SCHOOL]: ["📚", "✏️", "📝", "🎓", "📖", "🖊️", "📐", "🔬"],
  [GraphicTheme.SPORTS]: ["⚽", "🏀", "⚾", "🎾", "🏈", "🏐", "🏓", "⛳"],
};

export interface GameBoardGenerationData {
  courseName: string;
  sectionName: string;
  unitName: string;
  courseClassName: string;
  includeClassName: YesNo;
  lessons: LessonEntity[];
  lessonDivider: LessonDivider;
  graphicTheme: GraphicTheme;
  colorTheme: Color;
}

export interface GameBoardItem {
  type: "start" | "end" | "lesson" | "activity";
  lesson?: LessonEntity;
  activity?: ActivityEntity;
  lessonNumber?: string;
  lessonName?: string;
  isLastPage?: boolean;
  pageNumber?: number;
}

interface ItemGroup {
  items: GameBoardItem[];
  groupIndex: number;
}

/**
 * Prepare all game board items in sequence
 */
export function prepareGameBoardItems(
  lessons: LessonEntity[]
): GameBoardItem[] {
  const items: GameBoardItem[] = [{ type: "start" }];

  for (const lesson of lessons) {
    items.push({
      type: "lesson",
      lesson,
      lessonNumber: lesson.lessonNumber,
      lessonName: lesson.name,
    });

    for (const activity of lesson.activities) {
      items.push({
        type: "activity",
        lesson,
        activity,
      });
    }
  }

  items.push({ type: "end", isLastPage: true });
  return items;
}

/**
 * Paginate items - 15 items per page (2 rows x 7 squares + 1 connector)
 */
export function paginateGameBoardItems(
  items: GameBoardItem[],
  itemsPerPage: number = 15
): GameBoardItem[][] {
  const pages: GameBoardItem[][] = [];
  let currentPage: GameBoardItem[] = [];

  for (const item of items) {
    if (item.type === "end" && item.isLastPage) {
      currentPage.push(item);
      pages.push(currentPage);
      break;
    }

    currentPage.push(item);

    if (currentPage.length >= itemsPerPage) {
      currentPage[currentPage.length - 1] = {
        type: "end",
        isLastPage: false,
        pageNumber: pages.length + 2,
      };
      pages.push(currentPage);
      currentPage = [];
    }
  }

  if (currentPage.length > 0) {
    const hasEnd = currentPage.some((i) => i.type === "end" && i.isLastPage);
    if (!hasEnd) pages.push(currentPage);
  }

  return pages;
}

/**
 * Create snake grid groups
 * Pattern: 7 items horizontal, 1 item vertical connector, 7 items horizontal (reversed)...
 */
export function createSnakeGridGroups(items: GameBoardItem[]): ItemGroup[] {
  const groups: ItemGroup[] = [];
  let remainingItems = [...items];
  let groupIndex = 0;

  while (remainingItems.length > 0) {
    const chunkSize = groupIndex % 2 === 1 ? 1 : SQUARES_PER_ROW;
    const group = remainingItems.slice(0, chunkSize);

    groups.push({
      items: group,
      groupIndex,
    });

    remainingItems = remainingItems.slice(chunkSize);
    groupIndex++;
  }

  return groups;
}

/**
 * Generate document style for landscape orientation
 */
export function generateGameBoardDocumentStyleRequest(): DocsRequest {
  return {
    updateDocumentStyle: {
      documentStyle: {
        marginTop: { magnitude: PAGE_MARGIN, unit: "PT" },
        marginBottom: { magnitude: PAGE_MARGIN, unit: "PT" },
        marginLeft: { magnitude: PAGE_MARGIN, unit: "PT" },
        marginRight: { magnitude: PAGE_MARGIN, unit: "PT" },
        pageSize: {
          width: { magnitude: PAGE_WIDTH, unit: "PT" },
          height: { magnitude: PAGE_HEIGHT, unit: "PT" },
        },
      },
      fields: "marginTop,marginBottom,marginLeft,marginRight,pageSize",
    },
  };
}

/**
 * Generate header with title, subtitle, and form fields
 */
export function generateGameBoardHeaderRequests(
  data: GameBoardGenerationData
): DocsRequest[] {
  const requests: DocsRequest[] = [];
  let currentIndex = 1;

  const titleColor =
    data.colorTheme === Color.BLACK_AND_WHITE ? BLACK : BRAND_BLUE;

  const titleText = `${data.sectionName}\n`;
  requests.push({
    insertText: { text: titleText, location: { index: currentIndex } },
  });
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + titleText.length,
      },
      textStyle: {
        bold: true,
        fontSize: { magnitude: 18, unit: "PT" },
        foregroundColor: { color: { rgbColor: titleColor } },
      },
      fields: "bold,fontSize,foregroundColor",
    },
  });
  currentIndex += titleText.length;

  const subtitleText = `${data.courseName} / ${data.unitName}\n\n`;
  requests.push({
    insertText: { text: subtitleText, location: { index: currentIndex } },
  });
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + subtitleText.length,
      },
      textStyle: {
        fontSize: { magnitude: 14, unit: "PT" },
        foregroundColor: { color: { rgbColor: titleColor } },
      },
      fields: "fontSize,foregroundColor",
    },
  });
  currentIndex += subtitleText.length;

  const classNameText =
    data.includeClassName === YesNo.YES
      ? data.courseClassName
      : "______________";
  const formText = `Name: _______________________________   Date: ______________   Class: ${classNameText}\n\n`;

  requests.push({
    insertText: { text: formText, location: { index: currentIndex } },
  });

  if (
    data.includeClassName === YesNo.YES &&
    data.colorTheme !== Color.BLACK_AND_WHITE
  ) {
    const classStart = currentIndex + formText.indexOf(data.courseClassName);
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

/**
 * Calculates the number of table rows needed for a page of items.
 * 7 items per main row + 1 connector row between main rows.
 */
function calculateTableRows(itemCount: number): number {
  if (itemCount === 0) return 0;
  const mainRows = Math.ceil(itemCount / SQUARES_PER_ROW);
  const connectorRows = Math.max(0, mainRows - 1);
  return mainRows + connectorRows;
}

/**
 * Generates the single large table for the page.
 */
export function generatePageTableRequest(itemCount: number): DocsRequest {
  const rows = calculateTableRows(itemCount);
  return {
    insertTable: {
      rows: rows,
      columns: SQUARES_PER_ROW,
      endOfSegmentLocation: { segmentId: "" },
    },
  };
}

/**
 * Iterates the single table and maps linear items to Snake Coordinates
 */
export function generateSnakeContentRequests(
  items: GameBoardItem[],
  tableElement: gapi.client.docs.StructuralElement,
  data: GameBoardGenerationData,
  settings: UserSetting
): DocsRequest[] {
  const requests: DocsRequest[] = [];
  if (!tableElement.table || !tableElement.table.tableRows) return [];

  const tableStartIndex = tableElement.startIndex!;
  const rows = tableElement.table.tableRows;
  let currentItemIndex = 0;

  type CellOperation = {
    item: GameBoardItem;
    cellStartIndex: number;
    row: number;
    col: number;
  };

  const cellOperations: CellOperation[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const isConnectorRow = rowIndex % 2 !== 0; // rows 1, 3, 5 are connectors

    const rowGroupIndex = Math.floor(rowIndex / 2);
    const isReverseFlow = rowGroupIndex % 2 !== 0;

    const rowCells = rows[rowIndex].tableCells || [];

    if (isConnectorRow) {
      const connectorColIndex = isReverseFlow ? 0 : 6;

      for (let colIndex = 0; colIndex < rowCells.length; colIndex++) {
        const cell = rowCells[colIndex];
        const cellStartIndex = cell.startIndex!;

        if (colIndex === connectorColIndex && currentItemIndex < items.length) {
          cellOperations.push({
            item: items[currentItemIndex],
            cellStartIndex: cellStartIndex,
            row: rowIndex,
            col: colIndex,
          });
          currentItemIndex++;
        } else {
          requests.push(
            generateEmptyCellStyle(tableStartIndex, rowIndex, colIndex)
          );
        }
      }
    } else {
      const itemsInRow = items.slice(
        currentItemIndex,
        currentItemIndex + SQUARES_PER_ROW
      );

      const activeColumns = new Set<number>();

      for (let i = 0; i < itemsInRow.length; i++) {
        const item = itemsInRow[i];
        const colIndex = isReverseFlow ? 6 - i : i;
        activeColumns.add(colIndex);

        const cell = rowCells[colIndex];
        if (cell && cell.startIndex) {
          cellOperations.push({
            item: item,
            cellStartIndex: cell.startIndex,
            row: rowIndex,
            col: colIndex,
          });
        }
      }

      for (let colIndex = 0; colIndex < 7; colIndex++) {
        if (!activeColumns.has(colIndex)) {
          requests.push(
            generateEmptyCellStyle(tableStartIndex, rowIndex, colIndex)
          );
        }
      }

      currentItemIndex += itemsInRow.length;
    }
  }

  cellOperations.sort((a, b) => b.cellStartIndex - a.cellStartIndex);

  for (const op of cellOperations) {
    requests.push(
      ...generateCellContent(
        op.item,
        op.cellStartIndex,
        tableStartIndex,
        op.row,
        op.col,
        data,
        settings
      )
    );
  }

  return requests;
}

/**
 * Hides borders for empty cells to make them look like whitespace
 */
function generateEmptyCellStyle(
  tableStart: number,
  row: number,
  col: number
): DocsRequest {
  const noBorder = {
    width: { magnitude: 0, unit: "PT" },
    dashStyle: "SOLID",
    color: { color: { rgbColor: TRANSPARENT } },
  };
  return {
    updateTableCellStyle: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: { index: tableStart },
          rowIndex: row,
          columnIndex: col,
        },
        rowSpan: 1,
        columnSpan: 1,
      },
      tableCellStyle: {
        borderTop: noBorder,
        borderBottom: noBorder,
        borderLeft: noBorder,
        borderRight: noBorder,
        backgroundColor: { color: { rgbColor: TRANSPARENT } },
      },
      fields: "borderTop,borderBottom,borderLeft,borderRight,backgroundColor",
    },
  };
}

/**
 * Generates content and style for a cell
 */
function generateCellContent(
  item: GameBoardItem,
  contentIndex: number,
  tableStart: number,
  row: number,
  col: number,
  data: GameBoardGenerationData,
  settings: UserSetting
): DocsRequest[] {
  const requests: DocsRequest[] = [];
  const borderStyle = {
    width: { magnitude: 1, unit: "PT" },
    dashStyle: "SOLID",
    color: { color: { rgbColor: BLACK } },
  };
  const cellStyleBase = {
    borderTop: borderStyle,
    borderBottom: borderStyle,
    borderLeft: borderStyle,
    borderRight: borderStyle,
    paddingTop: { magnitude: 4, unit: "PT" },
    paddingBottom: { magnitude: 4, unit: "PT" },
    paddingLeft: { magnitude: 4, unit: "PT" },
    paddingRight: { magnitude: 4, unit: "PT" },
    contentAlignment: "MIDDLE",
  };
  const cellBaseFields = "backgroundColor,paddingTop,paddingBottom,paddingLeft,paddingRight,borderTop,borderBottom,borderLeft,borderRight,contentAlignment";

  const paragraphStyleAndFieldsBase = {
    paragraphStyle: {
      alignment: "CENTER",
    },
    fields: "alignment,spaceAbove",
  };

  const insertIndex = contentIndex + 1;

  const cellBackgroundColor =
    data.colorTheme === Color.BLACK_AND_WHITE ? LIGHT_GREY : GOLD;

  switch (item.type) {
    case "start": {
      const text = `Start!\n\n⮕`;
      requests.push({ insertText: { text, location: { index: insertIndex } } });
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + text.length,
          },
          textStyle: { bold: true, fontSize: { magnitude: 24, unit: "PT" } },
          fields: "bold,fontSize",
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + text.length,
          },
          ...paragraphStyleAndFieldsBase
        },
      });

      requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStart },
              rowIndex: row,
              columnIndex: col,
            },
            rowSpan: 1,
            columnSpan: 1,
          },
          tableCellStyle: {
            ...cellStyleBase,
            backgroundColor: { color: { rgbColor: cellBackgroundColor } },
          },
          fields: cellBaseFields
        },
      });
      break;
    }
    case "end": {
      const isLastPage = item.isLastPage ?? true;
      const pageNumber = item.pageNumber ?? 2;
      const displayText = isLastPage
        ? `Finish!`
        : `Continue to Page ${pageNumber}\n\n↪️`;

      requests.push({
        insertText: { text: displayText, location: { index: insertIndex } },
      });
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + displayText.length,
          },
          textStyle: {
            bold: true,
            fontSize: { magnitude: isLastPage ? 24 : 18, unit: "PT" },
          },
          fields: "bold,fontSize",
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + displayText.length,
          },
          ...paragraphStyleAndFieldsBase
        },
      });

      requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStart },
              rowIndex: row,
              columnIndex: col,
            },
            rowSpan: 1,
            columnSpan: 1,
          },
          tableCellStyle: {
            ...cellStyleBase,
            backgroundColor: { color: { rgbColor: cellBackgroundColor } },
          },
          fields: cellBaseFields
        },
      });
      break;
    }
    case "lesson": {
      const lessonNumber = item.lessonNumber || "1";
      const colors = getLessonColors(
        lessonNumber,
        data.colorTheme,
        data.lessonDivider
      );
      const text = formatLessonText(
        lessonNumber,
        item.lessonName || "",
        data.lessonDivider,
        data.graphicTheme
      );

      requests.push({ insertText: { text, location: { index: insertIndex } } });

      const fontSize =
        data.lessonDivider === LessonDivider.LESSON_NUMBER
          ? 70
          : data.lessonDivider === LessonDivider.LESSON_NUMBER_AND_GRAPHIC
          ? 32
          : data.lessonDivider === LessonDivider.LESSON_NAME_AND_GRAPHIC
          ? 16
          : 10;

      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + text.length,
          },
          textStyle: {
            fontSize: { magnitude: fontSize, unit: "PT" },
            foregroundColor: { color: { rgbColor: colors.textColor } },
            bold:
              data.lessonDivider === LessonDivider.LESSON_NAME_AND_GRAPHIC ||
              data.lessonDivider === LessonDivider.LESSON_NUMBER_AND_GRAPHIC,
          },
          fields: "fontSize,foregroundColor,bold",
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + text.length,
          },
          ...paragraphStyleAndFieldsBase
        },
      });

      requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStart },
              rowIndex: row,
              columnIndex: col,
            },
            rowSpan: 1,
            columnSpan: 1,
          },
          tableCellStyle: {
            ...cellStyleBase,
            backgroundColor: { color: { rgbColor: colors.backgroundColor } },
          },
          fields: cellBaseFields
        },
      });
      break;
    }
    case "activity": {
      const activity = item.activity!;
      const dueDate = activity.classActivities?.[0]?.dueDate;
      const dateText = dueDate ? `${formatDate(dueDate)}\n\n` : "\n\n";
      const activityName = `${activity.name}\n\n`;
      const classification = activity.classification || "MUST_DO";
      const badgeLabelText =
        settings.CLASSIFICATION_LABELS[classification].label;
      const workstyleIcon = getWorkstyleIcon(activity.workstyle);

      if (dateText) {
        requests.push({
          insertText: { text: dateText, location: { index: insertIndex } },
        });
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: insertIndex,
              endIndex: insertIndex + dateText.length,
            },
            textStyle: {
              fontSize: { magnitude: 10, unit: "PT" },
              foregroundColor: { color: { rgbColor: GREY_TEXT } },
            },
            fields: "fontSize,foregroundColor",
          },
        });
      }

      const actStart = insertIndex + (dateText ? dateText.length : 0);
      requests.push({
        insertText: { text: activityName, location: { index: actStart } },
      });
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: actStart,
            endIndex: actStart + activityName.length,
          },
          textStyle: { fontSize: { magnitude: 10, unit: "PT" }, bold: true },
          fields: "fontSize,bold",
        },
      });
      requests.push({
        createParagraphBullets: {
          range: { startIndex: actStart, endIndex: actStart + 1 },
          bulletPreset: "BULLET_CHECKBOX",
        },
      });
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: actStart,
            endIndex: actStart + activityName.length,
          },
          paragraphStyle: {
            indentStart: { magnitude: 15.0, unit: "PT" },
            indentFirstLine: { magnitude: -3.0, unit: "PT" },
          },
          fields: "indentStart,indentFirstLine",
        },
      });

      const badgeText = `${badgeLabelText}`;
      const spaceText = " ";
      const iconText = `${workstyleIcon}`;

      const badgeStart = actStart + activityName.length;
      let currIndex = badgeStart;
      const badgeRgbColor = hexToDocsRgbColor(
        settings.CLASSIFICATION_LABELS[classification].color
      );
      const badgeColor =
        data.colorTheme === Color.BLACK_AND_WHITE ? BLACK : badgeRgbColor;
      requests.push({
        insertText: { text: badgeText, location: { index: currIndex } },
      });
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currIndex,
            endIndex: currIndex + badgeText.length,
          },
          textStyle: {
            fontSize: { magnitude: 10, unit: "PT" },
            foregroundColor: { color: { rgbColor: badgeColor } },
            bold: true,
          },
          fields: "fontSize,foregroundColor,bold",
        },
      });
      currIndex += badgeText.length;

      requests.push({
        insertText: {
          text: spaceText,
          location: { index: currIndex },
        },
      });

      currIndex += spaceText.length;
      requests.push({
        insertText: {
          text: iconText,
          location: { index: currIndex },
        },
      });
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currIndex,
            endIndex: currIndex + iconText.length,
          },
          textStyle: { fontSize: { magnitude: 11, unit: "PT" } },
          fields: "fontSize",
        },
      });
      currIndex += iconText.length;

      requests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: { index: tableStart },
              rowIndex: row,
              columnIndex: col,
            },
            rowSpan: 1,
            columnSpan: 1,
          },
          tableCellStyle: {
            ...cellStyleBase,
            backgroundColor: {
              color: { rgbColor: { red: 1, green: 1, blue: 1 } },
            },
            paddingLeft: { magnitude: 8, unit: "PT" },
            paddingRight: { magnitude: 8, unit: "PT" },
            contentAlignment: "MIDDLE",
          },
          fields: cellBaseFields
        },
      });
      break;
    }
  }
  return requests;
}

/**
 * Sets fixed column widths for the entire grid
 */
export function generatePageTablePropertiesRequest(
  tableStartIndex: number
): DocsRequest[] {
  const requests: DocsRequest[] = [];
  for (let col = 0; col < SQUARES_PER_ROW; col++) {
    requests.push({
      updateTableColumnProperties: {
        tableStartLocation: { index: tableStartIndex },
        columnIndices: [col],
        tableColumnProperties: {
          widthType: "FIXED_WIDTH",
          width: { magnitude: SQUARE_SIZE, unit: "PT" },
        },
        fields: "width,widthType",
      },
    });
  }
  requests.push({
    updateTableRowStyle: {
      tableStartLocation: { index: tableStartIndex },
      tableRowStyle: { minRowHeight: { magnitude: SQUARE_SIZE, unit: "PT" } },
      fields: "minRowHeight",
    },
  });
  return requests;
}

/**
 * Generate empty table structures for all groups
 */
export function generateGameBoardTableRequests(
  groups: ItemGroup[]
): DocsRequest[] {
  const requests: DocsRequest[] = [];

  for (const group of groups) {
    requests.push({
      insertTable: {
        rows: 1,
        columns: group.items.length,
        endOfSegmentLocation: { segmentId: "" },
      },
    });
  }

  return requests;
}

/**
 * Set table column widths and row heights
 */
export function generateTablePropertiesRequests(
  groups: ItemGroup[],
  tableStartIndices: number[]
): DocsRequest[] {
  const requests: DocsRequest[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const tableStartIndex = tableStartIndices[i];

    for (let col = 0; col < group.items.length; col++) {
      requests.push({
        updateTableColumnProperties: {
          tableStartLocation: { index: tableStartIndex },
          columnIndices: [col],
          tableColumnProperties: {
            widthType: "FIXED_WIDTH",
            width: { magnitude: SQUARE_SIZE, unit: "PT" },
          },
          fields: "width,widthType",
        },
      });
    }

    requests.push({
      updateTableRowStyle: {
        tableStartLocation: { index: tableStartIndex },
        rowIndices: [0],
        tableRowStyle: {
          minRowHeight: { magnitude: SQUARE_SIZE, unit: "PT" },
        },
        fields: "minRowHeight",
      },
    });
  }

  return requests;
}

/**
 * Get lesson colors based on lesson number
 */
function getLessonColors(
  lessonNumber: string,
  colorTheme: Color,
  lessonDivider: LessonDivider
) {
  if (
    lessonDivider === LessonDivider.LESSON_NAME_AND_GRAPHIC ||
    lessonDivider === LessonDivider.LESSON_NUMBER_AND_GRAPHIC
  ) {
    return {
      backgroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
      textColor: BLACK,
    };
  }

  if (colorTheme === Color.BLACK_AND_WHITE) {
    return {
      backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
      textColor: BLACK,
    };
  }

  const num = parseInt(lessonNumber) || 1;
  const colorIndex = (num - 1) % 4;
  return LESSON_COLORS[colorIndex];
}

/**
 * Get graphic emoji based on lesson number and theme
 */
function getGraphicEmoji(lessonNumber: string, theme: GraphicTheme): string {
  const num = parseInt(lessonNumber) || 1;
  const emojiIndex = (num - 1) % 8;
  return GRAPHIC_EMOJIS[theme][emojiIndex];
}

/**
 * Format lesson text based on divider style
 */
function formatLessonText(
  lessonNumber: string,
  lessonName: string,
  lessonDivider: LessonDivider,
  graphicTheme: GraphicTheme
): string {
  const emoji = getGraphicEmoji(lessonNumber, graphicTheme);

  switch (lessonDivider) {
    case LessonDivider.LESSON_NAME:
      return lessonName;
    case LessonDivider.LESSON_NUMBER:
      return lessonNumber;
    case LessonDivider.LESSON_NAME_AND_GRAPHIC:
      return `Lesson ${lessonNumber}\n\n${emoji}`;
    case LessonDivider.LESSON_NUMBER_AND_GRAPHIC:
      return `${emoji} ${lessonNumber}`;
    default:
      return lessonNumber;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Get workstyle icon
 */
function getWorkstyleIcon(workstyle: string): string {
  return workstyle === "COLLABORATIVE" ? "👥+" : "👤";
}
