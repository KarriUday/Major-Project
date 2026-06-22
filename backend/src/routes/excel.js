const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const {
  createWorkbook,
  styleHeader,
  adjustColumnWidth,
  saveWorkbook,
  formatDate,
} = require('../utils/excel');

const prisma = new PrismaClient();

// Helper: Export Students Sheet
const exportStudents = async (workbook, cycleId) => {
  const worksheet = workbook.addWorksheet('Students');

  // Add headers
  worksheet.columns = [
    { header: 'USN', key: 'usn', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Department', key: 'department', width: 15 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Batch', key: 'batch', width: 10 },
    { header: 'GPA', key: 'gpa', width: 10 },
    { header: 'Cycle', key: 'cycle', width: 20 },
  ];

  styleHeader(worksheet);

  // Fetch students
  const students = await prisma.student.findMany({
    where: cycleId ? { cycle: cycleId } : undefined,
    include: {
      user: true,
    },
    orderBy: { usn: 'asc' },
  });

  // Add data
  students.forEach((student) => {
    worksheet.addRow({
      usn: student.usn,
      name: `${student.user.firstName} ${student.user.lastName}`,
      email: student.user.email,
      phone: student.user.phone || 'N/A',
      department: student.user.department || 'N/A',
      section: student.section || 'N/A',
      batch: student.batch || 'N/A',
      gpa: student.gpa ? student.gpa.toFixed(2) : 'N/A',
      cycle: student.cycle,
    });
  });

  adjustColumnWidth(worksheet);
};

// Helper: Export Groups Sheet
const exportGroups = async (workbook, cycleId) => {
  const worksheet = workbook.addWorksheet('Groups');

  worksheet.columns = [
    { header: 'Group ID', key: 'groupId', width: 20 },
    { header: 'Group Name', key: 'groupName', width: 20 },
    { header: 'Project Title', key: 'projectTitle', width: 30 },
    { header: 'Domain', key: 'projectDomain', width: 20 },
    { header: 'Members Count', key: 'memberCount', width: 15 },
    { header: 'Members', key: 'members', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Max Members', key: 'maxMembers', width: 12 },
    { header: 'Created Date', key: 'createdAt', width: 15 },
  ];

  styleHeader(worksheet);

  // Fetch groups
  const groups = await prisma.projectGroup.findMany({
    where: cycleId ? { cycleId } : undefined,
    include: {
      members: {
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: { groupName: 'asc' },
  });

  // Add data
  groups.forEach((group) => {
    const memberNames = group.members
      .map((m) => `${m.student.user.firstName} ${m.student.user.lastName}`)
      .join(', ');

    worksheet.addRow({
      groupId: group.id,
      groupName: group.groupName,
      projectTitle: group.projectTitle,
      projectDomain: group.projectDomain,
      memberCount: group.members.length,
      members: memberNames || 'No members',
      status: group.status,
      maxMembers: group.maxMembers,
      createdAt: formatDate(group.createdAt),
    });
  });

  adjustColumnWidth(worksheet);
};

// Helper: Export Faculty Sheet
const exportFaculty = async (workbook) => {
  const worksheet = workbook.addWorksheet('Faculty');

  worksheet.columns = [
    { header: 'Employee ID', key: 'empId', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Department', key: 'department', width: 15 },
    { header: 'Specialization', key: 'specialization', width: 20 },
    { header: 'Max Groups Allowed', key: 'maxGroupsAllowed', width: 18 },
    { header: 'Assigned Groups Count', key: 'assignedCount', width: 20 },
  ];

  styleHeader(worksheet);

  // Fetch faculty
  const faculty = await prisma.faculty.findMany({
    include: {
      user: true,
      allocations: true,
    },
    orderBy: { empId: 'asc' },
  });

  // Add data
  faculty.forEach((f) => {
    worksheet.addRow({
      empId: f.empId,
      name: `${f.user.firstName} ${f.user.lastName}`,
      email: f.user.email,
      department: f.user.department || 'N/A',
      specialization: f.specialization || 'N/A',
      maxGroupsAllowed: f.maxGroupsAllowed,
      assignedCount: f.allocations.length,
    });
  });

  adjustColumnWidth(worksheet);
};

// Helper: Export Allocations Sheet
const exportAllocations = async (workbook, cycleId) => {
  const worksheet = workbook.addWorksheet('Allocations');

  worksheet.columns = [
    { header: 'Group ID', key: 'groupId', width: 20 },
    { header: 'Group Name', key: 'groupName', width: 20 },
    { header: 'Project Title', key: 'projectTitle', width: 30 },
    { header: 'Faculty Employee ID', key: 'empId', width: 18 },
    { header: 'Faculty Name', key: 'facultyName', width: 25 },
    { header: 'Faculty Email', key: 'facultyEmail', width: 25 },
    { header: 'Allocation Date', key: 'allocationDate', width: 15 },
    { header: 'Status', key: 'allocationStatus', width: 15 },
    { header: 'Group Status', key: 'groupStatus', width: 15 },
  ];

  styleHeader(worksheet);

  // Fetch allocations
  const allocations = await prisma.groupAllocation.findMany({
    where: cycleId
      ? {
          group: { cycleId },
        }
      : undefined,
    include: {
      group: true,
      faculty: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { allocationDate: 'desc' },
  });

  // Add data
  allocations.forEach((allocation) => {
    worksheet.addRow({
      groupId: allocation.group.id,
      groupName: allocation.group.groupName,
      projectTitle: allocation.group.projectTitle,
      empId: allocation.faculty.empId,
      facultyName: `${allocation.faculty.user.firstName} ${allocation.faculty.user.lastName}`,
      facultyEmail: allocation.faculty.user.email,
      allocationDate: formatDate(allocation.allocationDate),
      allocationStatus: allocation.allocationStatus,
      groupStatus: allocation.group.status,
    });
  });

  adjustColumnWidth(worksheet);
};

// Export all sheets (combined)
router.get('/export-all', async (req, res) => {
  try {
    const { cycleId } = req.query;

    const workbook = createWorkbook();

    // Export all sheets
    await exportStudents(workbook, cycleId);
    await exportGroups(workbook, cycleId);
    await exportFaculty(workbook);
    await exportAllocations(workbook, cycleId);

    // Save and send
    const fileName = `project-tracking-export-${Date.now()}.xlsx`;
    const filePath = await saveWorkbook(workbook, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('[Excel] Download error:', err);
    });
  } catch (error) {
    console.error('[Excel] Export error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Export Students only
router.get('/export-students', async (req, res) => {
  try {
    const { cycleId } = req.query;

    const workbook = createWorkbook();
    await exportStudents(workbook, cycleId);

    const fileName = `students-export-${Date.now()}.xlsx`;
    const filePath = await saveWorkbook(workbook, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('[Excel] Download error:', err);
    });
  } catch (error) {
    console.error('[Excel] Export error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Export Groups only
router.get('/export-groups', async (req, res) => {
  try {
    const { cycleId } = req.query;

    const workbook = createWorkbook();
    await exportGroups(workbook, cycleId);

    const fileName = `groups-export-${Date.now()}.xlsx`;
    const filePath = await saveWorkbook(workbook, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('[Excel] Download error:', err);
    });
  } catch (error) {
    console.error('[Excel] Export error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Export Faculty only
router.get('/export-faculty', async (req, res) => {
  try {
    const workbook = createWorkbook();
    await exportFaculty(workbook);

    const fileName = `faculty-export-${Date.now()}.xlsx`;
    const filePath = await saveWorkbook(workbook, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('[Excel] Download error:', err);
    });
  } catch (error) {
    console.error('[Excel] Export error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Export Allocations only
router.get('/export-allocations', async (req, res) => {
  try {
    const { cycleId } = req.query;

    const workbook = createWorkbook();
    await exportAllocations(workbook, cycleId);

    const fileName = `allocations-export-${Date.now()}.xlsx`;
    const filePath = await saveWorkbook(workbook, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('[Excel] Download error:', err);
    });
  } catch (error) {
    console.error('[Excel] Export error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
