import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

interface CertificateData {
  tokenId: bigint;
  recipientName: string;
  institutionName: string;
  recipient: string;
  isValid: boolean;
  isMinted: boolean;
  baseRoute: string;
  qrData: string;
  mintedAt: bigint;
  lastUpdated: bigint;
  totalCourses: bigint;
  paymentReceiptHash: string;
}

interface CourseData {
  id: bigint;
  title: string;
  description: string;
  creator: string;
  price: bigint;
  isActive: boolean;
  isDeleted: boolean;
  duration: bigint;
  createdAt: bigint;
  totalStudents: bigint;
  averageRating: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdStr } = await params;
    const tokenId = BigInt(tokenIdStr);

    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
    });

    const certificateContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: CERTIFICATE_MANAGER_ADDRESS,
    });

    const courseFactoryContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: COURSE_FACTORY_ADDRESS,
    });

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const certificateData = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256 tokenId) view returns (tuple(uint256 tokenId, string recipientName, string institutionName, address recipient, bool isValid, bool isMinted, string baseRoute, string qrData, uint256 mintedAt, uint256 lastUpdated, uint256 totalCourses, bytes32 paymentReceiptHash))",
      params: [tokenId],
    })) as CertificateData;

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const completedCourses = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificateCompletedCourses(uint256 tokenId) view returns (uint256[])",
      params: [tokenId],
    })) as bigint[];

    const courseTitles: string[] = [];
    for (const courseId of completedCourses) {
      try {
        // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
        const courseData = (await readContract({
          contract: courseFactoryContract,
          method:
            "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
          params: [courseId],
        })) as CourseData;
        courseTitles.push(courseData.title);
      } catch {
        courseTitles.push(`Course #${courseId}`);
      }
    }

    const mintDate = new Date(
      Number(certificateData.mintedAt) * 1000
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const statusColor = certificateData.isValid ? "#10B981" : "#EF4444";
    const statusText = certificateData.isValid ? "VERIFIED" : "REVOKED";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            backgroundImage:
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#FFFFFF",
              borderRadius: "32px",
              padding: "80px",
              width: "90%",
              maxWidth: "1100px",
              border: "8px solid #F3F4F6",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                display: "flex",
                alignItems: "center",
                backgroundColor: statusColor,
                paddingLeft: "24px",
                paddingRight: "24px",
                paddingTop: "12px",
                paddingBottom: "12px",
                borderRadius: "9999px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#FFFFFF",
                }}
              >
                {statusText}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "40px",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "9999px",
                  backgroundColor: "#667eea",
                  marginBottom: "24px",
                }}
              />
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  color: "#667eea",
                  margin: 0,
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                {certificateData.institutionName}
              </h1>
              <p
                style={{
                  fontSize: "24px",
                  color: "#6B7280",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Certificate of Completion
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "40px",
                padding: "32px",
                backgroundColor: "#F9FAFB",
                borderRadius: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "20px",
                  color: "#6B7280",
                  margin: 0,
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                This is to certify that
              </p>
              <h2
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#1F2937",
                  margin: 0,
                  marginBottom: "24px",
                  textAlign: "center",
                  borderBottom: "3px solid #667eea",
                  paddingBottom: "16px",
                }}
              >
                {certificateData.recipientName}
              </h2>
              <p
                style={{
                  fontSize: "20px",
                  color: "#6B7280",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: "1.6",
                }}
              >
                has successfully completed{" "}
                <strong style={{ color: "#1F2937" }}>
                  {certificateData.totalCourses} course
                  {Number(certificateData.totalCourses) > 1 ? "s" : ""}
                </strong>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#F3F4F6",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "32px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#4B5563",
                  margin: 0,
                  marginBottom: "12px",
                }}
              >
                Completed Courses:
              </h3>
              <p
                style={{
                  fontSize: "16px",
                  color: "#1F2937",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                {courseTitles.join(" • ")}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "14px",
                    color: "#9CA3AF",
                    marginBottom: "4px",
                  }}
                >
                  Issue Date
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  {mintDate}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "14px",
                    color: "#9CA3AF",
                    marginBottom: "4px",
                  }}
                >
                  Certificate ID
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1F2937",
                    fontFamily: "monospace",
                  }}
                >
                  #{tokenId.toString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
      }
    );
  } catch (error) {
    console.error("Error generating certificate image:", error);
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F3F4F6",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              color: "#1F2937",
            }}
          >
            Error Loading Certificate
          </h1>
        </div>
      ),
      {
        width: 1200,
        height: 800,
      }
    );
  }
}
