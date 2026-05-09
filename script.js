// script.js

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

      <select class="grade-select" data-credit="${item.credit}">
        <option value="">Grade</option>
        <option value="O">O</option>
        <option value="A+">A+</option>
        <option value="A">A</option>
        <option value="B+">B+</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="F">F</option>
      </select>
    `;

    subjectsContainer.appendChild(row);

  });

});

calculateSGPA.addEventListener("click", () => {

  const grades = document.querySelectorAll(".grade-select");

  let totalCredits = 0;
  let totalPoints = 0;

  grades.forEach(select => {

    const grade = select.value;
    const credit = Number(select.dataset.credit);

    if(grade !== ""){

      totalCredits += credit;
      totalPoints += credit * gradePoints[grade];

    }

  });

  if(totalCredits === 0){

    sgpaResult.innerText = "Please enter grades.";
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