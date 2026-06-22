const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const createWorkbook = () => {
  return new ExcelJS.Workbook();
};

const styleHeader = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.autoFilter.from = 'A1';
};

const adjustColumnWidth = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });
};

const saveWorkbook = async (workbook, fileName) => {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN');
};

module.exports = {
  createWorkbook,
  styleHeader,
  adjustColumnWidth,
  saveWorkbook,
  formatDate,
};
