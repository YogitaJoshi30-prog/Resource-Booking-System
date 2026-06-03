// Function to mark attendance
function markAttendance() {
    const studentName = document.getElementById('studentName').value;
    const attendanceStatus = document.getElementById('attendanceStatus').value;
    const date = new Date().toLocaleDateString();

    if (studentName && attendanceStatus) {
        const attendanceRecord = {
            studentName: studentName,
            attendanceStatus: attendanceStatus,
            date: date
        };

        // Save the record to local storage
       saveAttendance(attendanceRecord);

        // Display the new record in the table
        addRecordToTable(attendanceRecord);

        // Reset the form
        document.getElementById('attendanceForm').reset();
    } else {
        alert("Please fill in all fields.");
    }
}

// Function to save attendance record to local storage
function saveAttendance(record) {
    let records = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    records.push(record);
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
}

// Function to load attendance records from local storage
function loadAttendanceRecords() {
    const records = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    records.forEach(record => addRecordToTable(record));
}

// Function to add a record to the attendance table
function addRecordToTable(record) {
    const tableBody = document.getElementById('attendanceTable').getElementsByTagName('tbody')[0];
    const newRow = tableBody.insertRow();

    const nameCell = newRow.insertCell(0);
    const statusCell = newRow.insertCell(1);
    const dateCell = newRow.insertCell(2);


    nameCell.textContent = record.studentName;
    statusCell.textContent = record.attendanceStatus;
    dateCell.textContent = record.date;
}

// // Load records on page load
// document.addEventListener('DOMContentLoaded', loadAttendanceRecords);
