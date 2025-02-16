'use client';

import { useState, useEffect } from "react";
import { useAddress, useContract } from "thirdweb";  // Correct imports from thirdweb
import { contract } from "@/utils/contract";  // Your contract setup

interface Course {
  courseId: number;
  name: string;
  image: string;
  contentLink: string;
  pricePerMonthInUSD: number;
}

const Dashboard = () => {
  const address = useAddress();  // Use thirdweb's hook to get connected wallet address
  const { contract } = useContract(contract);  // Use the contract instance from contract.ts
  const [courses, setCourses] = useState<Course[]>([]);

  // Fetch the courses from the smart contract
  const fetchCourses = async () => {
    try {
      if (contract) {
        const courseCount: number = await contract.call("courseCounter");
        const courseData: Course[] = [];
        for (let i = 1; i <= courseCount; i++) {
          const course = await contract.call("courses", i);
          courseData.push(course);
        }
        setCourses(courseData);
      }
    } catch (error) {
      console.error("Error fetching courses", error);
    }
  };

  useEffect(() => {
    if (address) fetchCourses();  // Fetch courses once the wallet is connected
  }, [address]);

  // Minting the NFT for the selected course
  const handleMint = async (courseId: number, duration: number) => {
    try {
      const emailHash = "user-email-hash";  // This would come from user input
      const tx = await contract?.call("mintLicense", courseId, duration, emailHash, {
        value: ethers.utils.parseEther("0.001"),  // Set gas fee for minting
      });
      console.log("Transaction successful:", tx);
      await sendEmail(emailHash);  // Send email after minting
    } catch (error) {
      console.error("Error minting license:", error);
    }
  };

  // Send email after minting
  const sendEmail = async (emailHash: string) => {
    try {
      const response = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "user-email@example.com",  // Replace with actual email
          subject: "Course Access & NFT License",
          text: `You have successfully minted the course. Use the unique code for your access: ${emailHash}`,
        }),
      });
      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  return (
    <div>
      {!address ? (
        <div>
          <h1>Please connect your wallet</h1>
        </div>
      ) : (
        <div>
          <h1>Welcome to the Course Dashboard</h1>
          <div className="course-list">
            {courses.map((course, index) => (
              <div key={index} className="course-card">
                <img src={course.image} alt={course.name} className="w-full h-32 object-cover rounded-lg" />
                <h2>{course.name}</h2>
                <p>{course.contentLink}</p>
                <div className="actions">
                  <button onClick={() => handleMint(course.courseId, 1)}>Mint Course</button>
                  <button onClick={() => alert("Get Certificate Popup")}>Get Certificate</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
