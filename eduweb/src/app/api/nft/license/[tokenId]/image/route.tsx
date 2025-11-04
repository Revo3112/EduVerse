import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

interface LicenseData {
  courseId: bigint;
  student: string;
  purchaseDate: bigint;
  expiryDate: bigint;
  active: boolean;
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

    const courseLicenseContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: COURSE_LICENSE_ADDRESS,
    });

    const courseFactoryContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: COURSE_FACTORY_ADDRESS,
    });

    const courseIdFromToken = (tokenId >> BigInt(160)) & BigInt(0xffffffff);
    const studentFromToken =
      tokenId & BigInt("0xffffffffffffffffffffffffffffffffffffffff");

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const licenseData = (await readContract({
      contract: courseLicenseContract,
      method:
        "function getLicense(uint256 courseId, address student) view returns (tuple(uint256 courseId, address student, uint256 purchaseDate, uint256 expiryDate, bool active))",
      params: [
        courseIdFromToken,
        `0x${studentFromToken.toString(16).padStart(40, "0")}`,
      ],
    })) as LicenseData;

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const courseData = (await readContract({
      contract: courseFactoryContract,
      method:
        "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
      params: [courseIdFromToken],
    })) as CourseData;

    const isActive = licenseData.active;
    const isExpired =
      licenseData.expiryDate > 0 &&
      BigInt(Date.now()) / BigInt(1000) > licenseData.expiryDate;
    const status = isExpired ? "EXPIRED" : isActive ? "ACTIVE" : "INACTIVE";
    const statusColor = isExpired
      ? "#EF4444"
      : isActive
      ? "#10B981"
      : "#6B7280";

    const purchaseDate = new Date(
      Number(licenseData.purchaseDate) * 1000
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const expiryDate =
      licenseData.expiryDate > 0
        ? new Date(Number(licenseData.expiryDate) * 1000).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          )
        : "Never";

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
            backgroundColor: "#0F172A",
            backgroundImage:
              "radial-gradient(circle at 25px 25px, #1E293B 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1E293B 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#1E293B",
              borderRadius: "24px",
              padding: "60px",
              width: "90%",
              maxWidth: "1000px",
              border: "2px solid #334155",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "40px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h1
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    color: "#F1F5F9",
                    margin: 0,
                    marginBottom: "8px",
                  }}
                >
                  Course License
                </h1>
                <p
                  style={{
                    fontSize: "24px",
                    color: "#94A3B8",
                    margin: 0,
                  }}
                >
                  EduVerse Platform
                </p>
              </div>
              <div
                style={{
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
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#FFFFFF",
                  }}
                >
                  {status}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#0F172A",
                borderRadius: "16px",
                padding: "40px",
                marginBottom: "32px",
                border: "1px solid #334155",
              }}
            >
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#F1F5F9",
                  margin: 0,
                  marginBottom: "24px",
                  lineHeight: "1.2",
                }}
              >
                {courseData.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "32px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#64748B",
                      marginBottom: "8px",
                    }}
                  >
                    Course ID
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#F1F5F9",
                    }}
                  >
                    #{courseIdFromToken.toString()}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#64748B",
                      marginBottom: "8px",
                    }}
                  >
                    Purchase Date
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#F1F5F9",
                    }}
                  >
                    {purchaseDate}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#64748B",
                      marginBottom: "8px",
                    }}
                  >
                    Expiry Date
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#F1F5F9",
                    }}
                  >
                    {expiryDate}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#64748B",
                  }}
                >
                  License Token ID
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#94A3B8",
                    fontFamily: "monospace",
                  }}
                >
                  {tokenId.toString()}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "9999px",
                    backgroundColor: "#3B82F6",
                  }}
                />
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#F1F5F9",
                  }}
                >
                  EduVerse
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating license image:", error);
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
            backgroundColor: "#0F172A",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              color: "#F1F5F9",
            }}
          >
            Error Loading License
          </h1>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
