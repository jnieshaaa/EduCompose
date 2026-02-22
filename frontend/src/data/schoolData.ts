// lagunaUniversityData.ts

export interface Program {
  name: string;
}

export interface Department {
  code: string;
  name: string;
  programs: Program[];
}

export interface School {
  name: string;
  code: string;
  departments: Department[];
}

export const lagunaUniversity: School = {
  name: "Laguna University",
  code: "LU",
  departments: [
    {
      code: "CAS",
      name: "College of Arts and Sciences",
      programs: [
        { name: "Bachelor of Arts in Communication" },
        { name: "Bachelor of Science in Psychology" },
        { name: "Bachelor of Arts in Psychology" },
      ],
    },
    {
      code: "CBAA",
      name: "College of Business, Administration and Accountancy",
      programs: [
        { name: "Bachelor of Science in Accountancy" },
        { name: "Bachelor of Science in Accounting Information System" },
        { name: "Bachelor of Science in Entrepreneurship" },
        { name: "Bachelor of Science in Tourism Management" },
      ],
    },
    {
      code: "CSS",
      name: "College of Computing Studies",
      programs: [
        { name: "Bachelor of Science in Computer Science" },
        { name: "Bachelor of Science in Information Technology" },
      ],
    },
    {
      code: "CoEd",
      name: "College of Education",
      programs: [
        { name: "Bachelor of Elementary Education" },
        { name: "Bachelor of Secondary Education" },
      ],
    },
    {
      code: "CoEng",
      name: "College of Engineering",
      programs: [{ name: "Bachelor of Science in Mechanical Engineering" }],
    },
  ],
};
