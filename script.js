// script.js

function marksToGrade(marks) {
  if (marks >= 90) return "O";
  if (marks >= 80) return "A+";
  if (marks >= 70) return "A";
  if (marks >= 60) return "B+";
  if (marks >= 50) return "B";
  if (marks >= 40) return "C";
  return "F";
}

const semesterSelect = document.getElementById("semesterSelect");
const subjectsContainer = document.getElementById("subjectsContainer");
const calculateSGPA = document.getElementById("calculateSGPA");
const sgpaResult = document.getElementById("sgpaResult");

semesterSelect.addEventListener("change", () => {

  const semester = semesterSelect.value;

  subjectsContainer.innerHTML = "";

  if(!semester) return;

  semesterData[semester].forEach((item, index) => {

    const row = document.createElement("div");
    row.classList.add("subject-row");

    row.innerHTML = `
      <div class="subject-name">
        ${item.subject}
      </div>

      <div>
        Credit: ${item.credit}
      </div>

      <input type="number" class="marks-input" data-credit="${item.credit}" min="0" max="100" placeholder="Marks">
    `;

    subjectsContainer.appendChild(row);

  });

});

calculateSGPA.addEventListener("click", () => {

  const marksInputs = document.querySelectorAll(".marks-input");

  let totalCredits = 0;
  let totalPoints = 0;

  marksInputs.forEach(input => {

    const marks = parseFloat(input.value);
    const credit = Number(input.dataset.credit);

    if(!isNaN(marks) && marks !== ""){

      totalCredits += credit;
      totalPoints += credit * gradePoints[marksToGrade(marks)];

    }

  });

  if(totalCredits === 0){

    sgpaResult.innerText = "Please enter marks.";
    return;

  }

  const sgpa = (totalPoints / totalCredits).toFixed(2);

  sgpaResult.innerText = `SGPA: ${sgpa}`;

});


// CGPA SECTION

const cgpaSemester = document.getElementById("cgpaSemester");
const cgpaInputs = document.getElementById("cgpaInputs");
const calculateCGPA = document.getElementById("calculateCGPA");
const cgpaResult = document.getElementById("cgpaResult");

cgpaSemester.addEventListener("change", () => {

  const sem = Number(cgpaSemester.value);

  cgpaInputs.innerHTML = "";

  for(let i = 1; i <= sem; i++){

    const input = document.createElement("input");

    input.type = "number";
    input.step = "0.01";
    input.placeholder = `Enter Semester ${i} SGPA`;
    input.classList.add("cgpa-input");

    cgpaInputs.appendChild(input);

  }

});

calculateCGPA.addEventListener("click", () => {

  const inputs = document.querySelectorAll(".cgpa-input");

  let total = 0;
  let count = 0;

  inputs.forEach(input => {

    const value = parseFloat(input.value);

    if(!isNaN(value)){

      total += value;
      count++;

    }

  });

  if(count === 0){

    cgpaResult.innerText = "Please enter SGPAs.";
    return;

  }

  const cgpa = (total / count).toFixed(2);

  cgpaResult.innerText = `CGPA: ${cgpa}`;

});