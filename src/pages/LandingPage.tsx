import { useState, useEffect } from "react";
import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";

const landingStyles = `
  :root {
    --red-primary: #E02020;
    --red-dark: #B01818;
    --red-light: #FF4040;
    --dark-900: #111111;
    --dark-800: #1A1A1A;
    --dark-700: #222222;
    --dark-600: #2A2A2A;
    --gray-text: #6B7280;
    --gray-light: #F9FAFB;
  }

  html {
    scroll-behavior: smooth;
  }

  .landing-page {
    background-color: #ffffff;
    color: #111111;
  }

  /* Navbar */
  .lp-navbar {
    position: sticky;
    top: 0;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.06);
    transition: box-shadow 0.3s ease;
  }

  .lp-navbar.scrolled {
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
  }

  /* Buttons */
  .btn-primary {
    background-color: #E02020;
    color: #ffffff;
    padding: 12px 28px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  .btn-primary:hover {
    background-color: #B01818;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(224, 32, 32, 0.35);
  }

  .btn-secondary {
    background-color: transparent;
    color: #111111;
    padding: 11px 28px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    border: 2px solid #E0E0E0;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  .btn-secondary:hover {
    border-color: #E02020;
    color: #E02020;
    transform: translateY(-1px);
  }

  /* Feature cards */
  .feature-card {
    background: #ffffff;
    border: 1px solid #F0F0F0;
    border-radius: 16px;
    padding: 28px;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.08);
    border-color: #E02020;
  }

  .feature-icon {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #FFF0F0, #FFE0E0);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  /* Step cards */
  .step-card {
    background: #1A1A1A;
    border-radius: 16px;
    padding: 32px;
    position: relative;
    transition: transform 0.25s ease;
  }

  .step-card:hover {
    transform: translateY(-4px);
  }

  .step-number {
    width: 44px;
    height: 44px;
    background: #E02020;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    color: #ffffff;
    margin-bottom: 20px;
    flex-shrink: 0;
  }

  /* Testimonial cards */
  .testimonial-card {
    background: #ffffff;
    border: 1px solid #F0F0F0;
    border-radius: 16px;
    padding: 28px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .testimonial-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.08);
  }

  .avatar-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E02020, #FF6060);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    color: #ffffff;
    flex-shrink: 0;
  }

  /* Stats */
  .stat-card {
    text-align: center;
    padding: 32px 24px;
  }

  .stat-number {
    font-size: 48px;
    font-weight: 800;
    color: #E02020;
    line-height: 1;
    margin-bottom: 8px;
  }

  /* Pain point items */
  .pain-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    background: #FFF8F8;
    border-left: 4px solid #E02020;
    border-radius: 0 12px 12px 0;
    margin-bottom: 16px;
  }

  /* Nav links */
  .nav-link {
    color: #444444;
    font-weight: 500;
    font-size: 15px;
    text-decoration: none;
    transition: color 0.2s ease;
    padding: 6px 0;
    position: relative;
  }

  .nav-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: #E02020;
    transition: width 0.2s ease;
  }

  .nav-link:hover {
    color: #E02020;
  }

  .nav-link:hover::after {
    width: 100%;
  }

  /* Mobile menu */
  .mobile-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #ffffff;
    border-bottom: 1px solid #F0F0F0;
    padding: 16px 24px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .mobile-menu.open {
    display: block;
  }

  /* Hero gradient text */
  .gradient-text {
    background: linear-gradient(135deg, #E02020, #FF6060);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Section spacing */
  .section-padding {
    padding: 80px 0;
  }

  @media (max-width: 768px) {
    .section-padding {
      padding: 56px 0;
    }
    .stat-number {
      font-size: 36px;
    }
  }

  /* CTA section */
  .cta-section {
    background: linear-gradient(135deg, #111111 0%, #1A1A1A 50%, #2A1010 100%);
  }

  /* Badge */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #FFF0F0;
    color: #E02020;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #FFD0D0;
    margin-bottom: 20px;
  }

  /* Hero placeholder */
  .hero-placeholder {
    background: linear-gradient(135deg, #1A1A1A 0%, #2A1010 50%, #1A1A1A 100%);
    border-radius: 20px;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(224, 32, 32, 0.2);
  }

  .hero-placeholder::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 50%, rgba(224, 32, 32, 0.15) 0%, transparent 60%);
  }

  /* Divider */
  .section-divider {
    width: 60px;
    height: 4px;
    background: #E02020;
    border-radius: 2px;
    margin: 0 auto 16px;
  }

  .section-divider-left {
    margin: 0 0 16px;
  }

  /* Footer */
  .lp-footer {
    background: #111111;
    color: #ffffff;
  }

  .footer-link {
    color: #9CA3AF;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s ease;
  }

  .footer-link:hover {
    color: #E02020;
  }

  /* Pulse animation for live indicator */
  @keyframes pulse-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #E02020;
    border-radius: 50%;
    animation: pulse-red 1.5s ease-in-out infinite;
    display: inline-block;
  }

  /* Dashboard mock UI inside hero */
  .mock-dashboard {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px;
    width: 100%;
    max-width: 420px;
  }

  .mock-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    background: rgba(255,255,255,0.04);
  }

  .risk-badge-high {
    background: rgba(224, 32, 32, 0.2);
    color: #FF6060;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
  }

  .risk-badge-medium {
    background: rgba(251, 101, 20, 0.2);
    color: #FB6514;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
  }

  .risk-badge-low {
    background: rgba(18, 183, 106, 0.2);
    color: #12B76A;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
  }
`;


const ShieldIcon = () => (
    <img src="/images/logo/auth-logo.png" alt="AI-Advisor" width={32} height={32} style={{ objectFit: "contain" }} />
);

const ChartIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3V21H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16L11 10L15 13L20 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const AlertIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2L2 19H22L12 2Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M12 9V13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.75" fill={color} stroke={color} strokeWidth="0.5" />
    </svg>
);

const EmojiIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M8.5 15C9.5 16.5 14.5 16.5 15.5 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1" fill={color} />
        <circle cx="15" cy="10" r="1" fill={color} />
    </svg>
);

const AnomalyIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M5 12H8L10 8L12 16L14 10L16 13H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const DashboardIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5" />
    </svg>
);

const MeetingIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M3 9H21" stroke={color} strokeWidth="1.5" />
        <path d="M8 2V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 2V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 13H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 16H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const BellIcon = ({ color = "#E02020" }: { color?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2C8.7 2 6 4.7 6 8V13L4 15V16H20V15L18 13V8C18 4.7 15.3 2 12 2Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" fill="#E02020" />
        <path d="M6 10L8.5 12.5L14 7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="#E02020" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1L9.8 6H15L10.6 9.2L12.4 14.2L8 11L3.6 14.2L5.4 9.2L1 6H6.2L8 1Z" />
    </svg>
);

const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H21M3 12H21M3 18H21" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6L18 18M6 18L18 6" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PlayIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.5 5.5L11 8L6.5 10.5V5.5Z" fill="currentColor" />
    </svg>
);

const QuoteIcon = () => (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0 24V14.4C0 10.4 1.2 7.2 3.6 4.8C6 2.4 9.2 0.8 13.2 0L14.4 2.4C11.6 3.2 9.4 4.4 7.8 6C6.2 7.6 5.2 9.6 4.8 12H9.6V24H0ZM18 24V14.4C18 10.4 19.2 7.2 21.6 4.8C24 2.4 27.2 0.8 31.2 0L32 2.4C29.2 3.2 27 4.4 25.4 6C23.8 7.6 22.8 9.6 22.4 12H27.2V24H18Z"
            fill="#FFD0D0"
        />
    </svg>
);


const features = [
    {
        icon: <ChartIcon />,
        title: "Dự đoán nguy cơ học vụ",
        description:
            "Mô hình Random Forest (AI-01) phân tích GPA, tỷ lệ chuyên cần, mức độ stress và động lực học tập để phân loại nguy cơ: Cao / Trung bình / Thấp.",
        tag: "AI-01 · Random Forest",
    },
    {
        icon: <EmojiIcon />,
        title: "Phân tích cảm xúc",
        description:
            "PhoBERT (AI-02) xử lý ngôn ngữ tự nhiên tiếng Việt, phân tích feedback sau buổi tư vấn để phát hiện sinh viên đang căng thẳng hoặc mất động lực.",
        tag: "AI-02 · PhoBERT",
    },
    {
        icon: <AnomalyIcon />,
        title: "Phát hiện bất thường",
        description:
            "Isolation Forest kết hợp Z-score (AI-03) theo dõi thay đổi đột ngột trong hành vi học tập — điểm số giảm mạnh, vắng mặt liên tiếp, v.v.",
        tag: "AI-03 · Isolation Forest",
    },
    {
        icon: <DashboardIcon />,
        title: "Dashboard thời gian thực",
        description:
            "Bảng điều khiển tổng hợp hiển thị danh sách sinh viên nguy cơ, biểu đồ xu hướng và cảnh báo ưu tiên — tất cả trong một giao diện gọn gàng.",
        tag: "Realtime · Dashboard",
    },
    {
        icon: <MeetingIcon />,
        title: "Quản lý buổi tư vấn",
        description:
            "Lên lịch, ghi chép nội dung, upload tài liệu hỗ trợ và thu thập feedback sau mỗi buổi meeting — lưu trữ toàn bộ lịch sử tư vấn.",
        tag: "Meeting · Feedback",
    },
    {
        icon: <BellIcon />,
        title: "Cảnh báo thông minh",
        description:
            "Thông báo tức thời khi AI phát hiện sinh viên cần hỗ trợ khẩn cấp. Cố vấn nhận alert ngay trên dashboard và qua email.",
        tag: "Alert · Notification",
    },
];

const steps = [
    {
        number: "01",
        title: "Nhập dữ liệu học tập",
        description:
            "Sinh viên cập nhật điểm số, tỷ lệ chuyên cần và gửi feedback sau mỗi buổi tư vấn. Dữ liệu được mã hóa và lưu trữ an toàn.",
        detail: "GPA · Chuyên cần · Feedback · Stress level",
    },
    {
        number: "02",
        title: "AI phân tích tự động",
        description:
            "3 mô hình AI chạy song song: Random Forest dự đoán rủi ro, PhoBERT phân tích cảm xúc, Isolation Forest phát hiện bất thường hành vi.",
        detail: "AI-01 · AI-02 · AI-04 · Realtime",
    },
    {
        number: "03",
        title: "Cố vấn nhận cảnh báo & hành động",
        description:
            "Dashboard hiển thị danh sách sinh viên cần ưu tiên theo mức độ nguy cơ. Cố vấn can thiệp kịp thời với đầy đủ thông tin bối cảnh.",
        detail: "Dashboard · Alert · Intervention",
    },
];

const testimonials = [
    {
        initials: "NM",
        name: "ThS. Nguyễn Văn Minh",
        role: "Cố vấn học tập, Khoa CNTT",
        quote:
            "Trước đây tôi phải xem từng hồ sơ sinh viên thủ công. Giờ AI-Advisor tự động cảnh báo khi có sinh viên cần hỗ trợ, tiết kiệm rất nhiều thời gian.",
        stars: 5,
    },
    {
        initials: "TL",
        name: "Trần Thị Lan",
        role: "Sinh viên năm 3",
        quote:
            "Tôi nhận được sự hỗ trợ kịp thời từ cố vấn ngay khi điểm số bắt đầu giảm. Hệ thống giúp tôi không bị bỏ lại phía sau.",
        stars: 5,
    },
    {
        initials: "LN",
        name: "TS. Lê Hoàng Nam",
        role: "Trưởng khoa Kinh tế",
        quote:
            "Tỷ lệ sinh viên bỏ học trong khoa giảm đáng kể sau khi triển khai AI-Advisor. Dữ liệu minh bạch giúp chúng tôi ra quyết định tốt hơn.",
        stars: 5,
    },
];

const stats = [
    { number: "94.8%", label: "Độ chính xác dự đoán rủi ro" },
    { number: "3", label: "Mô hình AI tích hợp" },
    { number: "7 ngày", label: "Phát hiện bất thường sớm" },
    { number: "3", label: "Vai trò người dùng" },
];

const painPoints = [
    {
        title: "Quản lý hàng chục sinh viên cùng lúc",
        description:
            "Cố vấn không biết ai đang gặp khó khăn khi phải theo dõi thủ công hàng chục hồ sơ sinh viên mỗi học kỳ.",
    },
    {
        title: "Phát hiện vấn đề quá muộn",
        description:
            "Khi sinh viên đã bỏ học hoặc thi trượt, mọi can thiệp đều trở nên vô nghĩa. Cần phát hiện sớm từ những dấu hiệu đầu tiên.",
    },
    {
        title: "Thiếu dữ liệu để ra quyết định",
        description:
            "Không có công cụ phân tích, cố vấn phải dựa vào cảm tính thay vì dữ liệu khách quan để quyết định can thiệp.",
    },
];

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        setMobileMenuOpen(false);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="landing-page">
            <style>{landingStyles}</style>
            <PageMeta title="Trang chủ | AI-Advisor" description="Nền tảng AI hỗ trợ cố vấn học tập" />


            <nav className={`lp-navbar${scrolled ? " scrolled" : ""}`}>
                <div
                    style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        padding: "0 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: "68px",
                    }}
                >
                    <Link
                        to="/"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            textDecoration: "none",
                        }}
                    >
                        <ShieldIcon />
                        <span
                            style={{
                                fontSize: "20px",
                                fontWeight: "800",
                                color: "#111111",
                                letterSpacing: "-0.3px",
                            }}
                        >
                            AI-<span style={{ color: "#E02020" }}>Advisor</span>
                        </span>
                    </Link>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "32px",
                        }}
                        className="hidden md:flex"
                    >
                        <button
                            onClick={() => scrollToSection("features")}
                            className="nav-link"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            Tính năng
                        </button>
                        <button
                            onClick={() => scrollToSection("how-it-works")}
                            className="nav-link"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            Cách hoạt động
                        </button>
                        <button
                            onClick={() => scrollToSection("testimonials")}
                            className="nav-link"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            Đánh giá
                        </button>
                        <button
                            onClick={() => scrollToSection("contact")}
                            className="nav-link"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                            Liên hệ
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Link to="/signin" className="btn-primary" style={{ padding: "10px 22px", fontSize: "14px" }}>
                            Đăng nhập
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                            className="md:hidden"
                            aria-label="Mở/đóng menu"
                        >
                            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>

                <div className={`mobile-menu${mobileMenuOpen ? " open" : ""}`}>
                    {[
                        { label: "Tính năng", id: "features" },
                        { label: "Cách hoạt động", id: "how-it-works" },
                        { label: "Đánh giá", id: "testimonials" },
                        { label: "Liên hệ", id: "contact" },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "12px 0",
                                background: "none",
                                border: "none",
                                borderBottom: "1px solid #F5F5F5",
                                fontSize: "15px",
                                fontWeight: "500",
                                color: "#333333",
                                cursor: "pointer",
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>


            <section
                style={{
                    background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%)",
                    padding: "80px 0 100px",
                }}
            >
                <div
                    style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        padding: "0 24px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "64px",
                        alignItems: "center",
                    }}
                    className="hero-grid"
                >
                    <div>
                        <div className="badge">
                            <span className="pulse-dot" />
                            Nền tảng AI cho giáo dục đại học
                        </div>

                        <h1
                            style={{
                                fontSize: "clamp(32px, 5vw, 52px)",
                                fontWeight: "800",
                                lineHeight: "1.15",
                                color: "#111111",
                                marginBottom: "20px",
                                letterSpacing: "-0.5px",
                            }}
                        >
                            Phát hiện sớm sinh viên nguy cơ —{" "}
                            <span className="gradient-text">trước khi quá muộn</span>
                        </h1>

                        <p
                            style={{
                                fontSize: "17px",
                                lineHeight: "1.7",
                                color: "#555555",
                                marginBottom: "36px",
                                maxWidth: "520px",
                            }}
                        >
                            AI-Advisor tích hợp 3 mô hình AI giúp cố vấn học tập theo dõi toàn bộ sinh viên,
                            nhận cảnh báo tức thời và can thiệp đúng lúc.
                        </p>

                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "48px" }}>
                            <Link to="/signin" className="btn-primary">
                                Bắt đầu ngay <ArrowRightIcon />
                            </Link>
                            <button
                                className="btn-secondary"
                                onClick={() => scrollToSection("how-it-works")}
                            >
                                <PlayIcon /> Xem demo
                            </button>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "24px",
                                flexWrap: "wrap",
                                paddingTop: "24px",
                                borderTop: "1px solid #F0F0F0",
                            }}
                        >
                            {[
                                { value: "500+", label: "sinh viên được theo dõi" },
                                { value: "3", label: "mô hình AI" },
                                { value: "94.8%", label: "độ chính xác" },
                            ].map((item) => (
                                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "20px", fontWeight: "800", color: "#E02020" }}>
                                        {item.value}
                                    </span>
                                    <span style={{ fontSize: "13px", color: "#777777" }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hero-placeholder">
                        <div style={{ position: "relative", zIndex: 1, width: "100%", padding: "24px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "20px",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "4px" }}>
                                        Dashboard Cố vấn
                                    </div>
                                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
                                        Sinh viên nguy cơ cao
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(224,32,32,0.15)",
                                        padding: "6px 12px",
                                        borderRadius: "100px",
                                    }}
                                >
                                    <span className="pulse-dot" />
                                    <span style={{ fontSize: "12px", color: "#FF6060", fontWeight: "600" }}>
                                        Live
                                    </span>
                                </div>
                            </div>

                            <div className="mock-dashboard">
                                {[
                                    { name: "Nguyễn Văn A", gpa: "1.8", risk: "high", label: "Cao" },
                                    { name: "Trần Thị B", gpa: "2.1", risk: "medium", label: "Trung bình" },
                                    { name: "Lê Văn C", gpa: "2.8", risk: "medium", label: "Trung bình" },
                                    { name: "Phạm Thị D", gpa: "3.4", risk: "low", label: "Thấp" },
                                ].map((student) => (
                                    <div key={student.name} className="mock-row">
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div
                                                style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    background: "rgba(255,255,255,0.1)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "12px",
                                                    color: "#ffffff",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {student.name.split(" ").pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "13px", color: "#ffffff", fontWeight: "500" }}>
                                                    {student.name}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
                                                    GPA: {student.gpa}
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                student.risk === "high"
                                                    ? "risk-badge-high"
                                                    : student.risk === "medium"
                                                        ? "risk-badge-medium"
                                                        : "risk-badge-low"
                                            }
                                        >
                                            {student.label}
                                        </span>
                                    </div>
                                ))}

                                <div
                                    style={{
                                        marginTop: "12px",
                                        padding: "12px",
                                        background: "rgba(224,32,32,0.1)",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(224,32,32,0.2)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#FF6060",
                                            fontWeight: "600",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        AI đang phân tích...
                                    </div>
                                    <div
                                        style={{
                                            height: "4px",
                                            background: "rgba(255,255,255,0.1)",
                                            borderRadius: "2px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: "100%",
                                                width: "72%",
                                                background: "linear-gradient(90deg, #E02020, #FF6060)",
                                                borderRadius: "2px",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
          }
        `}</style>
            </section>

            <section style={{ background: "#ffffff", padding: "80px 0" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "64px",
                            alignItems: "center",
                        }}
                        className="problem-grid"
                    >
                        <div>
                            <div className="section-divider section-divider-left" />
                            <p style={{ fontSize: "13px", fontWeight: "600", color: "#E02020", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                Vấn đề hiện tại
                            </p>
                            <h2
                                style={{
                                    fontSize: "clamp(26px, 3.5vw, 38px)",
                                    fontWeight: "800",
                                    color: "#111111",
                                    marginBottom: "12px",
                                    lineHeight: "1.2",
                                }}
                            >
                                Cố vấn học tập đang gặp khó khăn gì?
                            </h2>
                            <p style={{ fontSize: "16px", color: "#666666", marginBottom: "32px", lineHeight: "1.6" }}>
                                Hệ thống giáo dục truyền thống thiếu công cụ hỗ trợ cố vấn phát hiện sớm sinh viên có nguy cơ.
                            </p>

                            {painPoints.map((point) => (
                                <div key={point.title} className="pain-item">
                                    <div style={{ flexShrink: 0, marginTop: "2px" }}>
                                        <AlertIcon color="#E02020" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "700", color: "#111111", marginBottom: "4px", fontSize: "15px" }}>
                                            {point.title}
                                        </div>
                                        <div style={{ fontSize: "14px", color: "#666666", lineHeight: "1.5" }}>
                                            {point.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                background: "linear-gradient(135deg, #111111 0%, #1A1A1A 100%)",
                                borderRadius: "20px",
                                padding: "40px",
                                color: "#ffffff",
                            }}
                        >
                            <div
                                style={{
                                    width: "56px",
                                    height: "56px",
                                    background: "rgba(224,32,32,0.15)",
                                    borderRadius: "14px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: "24px",
                                    border: "1px solid rgba(224,32,32,0.3)",
                                }}
                            >
                                <ShieldIcon />
                            </div>

                            <p style={{ fontSize: "13px", fontWeight: "600", color: "#E02020", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                Giải pháp
                            </p>
                            <h3 style={{ fontSize: "26px", fontWeight: "800", marginBottom: "16px", lineHeight: "1.3" }}>
                                AI-Advisor tự động phân tích và cảnh báo
                            </h3>
                            <p style={{ fontSize: "15px", color: "#AAAAAA", lineHeight: "1.7", marginBottom: "28px" }}>
                                Thay vì xem thủ công từng hồ sơ, cố vấn nhận được danh sách sinh viên cần ưu tiên
                                ngay trên dashboard — được sắp xếp theo mức độ nguy cơ, kèm phân tích chi tiết từ AI.
                            </p>

                            {[
                                "Phát hiện nguy cơ trước khi sinh viên bỏ học",
                                "Phân tích cảm xúc từ feedback tiếng Việt",
                                "Cảnh báo tức thời khi có bất thường",
                                "Dữ liệu minh bạch để ra quyết định",
                            ].map((item) => (
                                <div
                                    key={item}
                                    style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}
                                >
                                    <CheckIcon />
                                    <span style={{ fontSize: "14px", color: "#DDDDDD" }}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .problem-grid {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
          }
        `}</style>
            </section>

            <section id="features" style={{ background: "#F9FAFB", padding: "80px 0" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: "56px" }}>
                        <div className="section-divider" />
                        <p style={{ fontSize: "13px", fontWeight: "600", color: "#E02020", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Tính năng
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(26px, 3.5vw, 40px)",
                                fontWeight: "800",
                                color: "#111111",
                                marginBottom: "16px",
                                lineHeight: "1.2",
                            }}
                        >
                            Mọi thứ cố vấn cần trong một nền tảng
                        </h2>
                        <p style={{ fontSize: "17px", color: "#666666", maxWidth: "560px", margin: "0 auto", lineHeight: "1.6" }}>
                            Từ dự đoán rủi ro đến quản lý buổi tư vấn — AI-Advisor bao phủ toàn bộ quy trình hỗ trợ sinh viên.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "24px",
                        }}
                        className="features-grid"
                    >
                        {features.map((feature) => (
                            <div key={feature.title} className="feature-card">
                                <div className="feature-icon">{feature.icon}</div>
                                <div
                                    style={{
                                        display: "inline-block",
                                        background: "#FFF0F0",
                                        color: "#E02020",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        padding: "3px 10px",
                                        borderRadius: "100px",
                                        marginBottom: "12px",
                                        border: "1px solid #FFD0D0",
                                    }}
                                >
                                    {feature.tag}
                                </div>
                                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#111111", marginBottom: "10px" }}>
                                    {feature.title}
                                </h3>
                                <p style={{ fontSize: "14px", color: "#666666", lineHeight: "1.6" }}>
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
          @media (max-width: 1024px) {
            .features-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 640px) {
            .features-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
            </section>

            <section id="how-it-works" style={{ background: "#111111", padding: "80px 0" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: "56px" }}>
                        <div className="section-divider" />
                        <p style={{ fontSize: "13px", fontWeight: "600", color: "#E02020", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Cách hoạt động
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(26px, 3.5vw, 40px)",
                                fontWeight: "800",
                                color: "#ffffff",
                                marginBottom: "16px",
                                lineHeight: "1.2",
                            }}
                        >
                            Chỉ 3 bước đơn giản
                        </h2>
                        <p style={{ fontSize: "17px", color: "#AAAAAA", maxWidth: "520px", margin: "0 auto", lineHeight: "1.6" }}>
                            Từ lúc sinh viên nhập dữ liệu đến khi cố vấn nhận cảnh báo — toàn bộ quy trình diễn ra tự động.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "24px",
                            position: "relative",
                        }}
                        className="steps-grid"
                    >
                        {steps.map((step, index) => (
                            <div key={step.number} className="step-card">
                                {index < steps.length - 1 && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "54px",
                                            right: "-12px",
                                            width: "24px",
                                            height: "2px",
                                            background: "rgba(224,32,32,0.4)",
                                            zIndex: 1,
                                        }}
                                        className="step-connector"
                                    />
                                )}

                                <div className="step-number">{step.number}</div>
                                <h3 style={{ fontSize: "19px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
                                    {step.title}
                                </h3>
                                <p style={{ fontSize: "14px", color: "#AAAAAA", lineHeight: "1.7", marginBottom: "20px" }}>
                                    {step.description}
                                </p>
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "6px",
                                    }}
                                >
                                    {step.detail.split(" · ").map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                background: "rgba(224,32,32,0.12)",
                                                color: "#FF8080",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                padding: "3px 10px",
                                                borderRadius: "100px",
                                                border: "1px solid rgba(224,32,32,0.2)",
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .steps-grid {
              grid-template-columns: 1fr !important;
            }
            .step-connector {
              display: none !important;
            }
          }
        `}</style>
            </section>

            <section id="testimonials" style={{ background: "#ffffff", padding: "80px 0" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: "56px" }}>
                        <div className="section-divider" />
                        <p style={{ fontSize: "13px", fontWeight: "600", color: "#E02020", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Đánh giá
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(26px, 3.5vw, 40px)",
                                fontWeight: "800",
                                color: "#111111",
                                marginBottom: "16px",
                                lineHeight: "1.2",
                            }}
                        >
                            Người dùng nói gì về AI-Advisor?
                        </h2>
                        <p style={{ fontSize: "17px", color: "#666666", maxWidth: "520px", margin: "0 auto", lineHeight: "1.6" }}>
                            Từ cố vấn học tập đến sinh viên và quản lý khoa — mọi người đều thấy sự khác biệt.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "24px",
                        }}
                        className="testimonials-grid"
                    >
                        {testimonials.map((t) => (
                            <div key={t.name} className="testimonial-card">
                                <div style={{ marginBottom: "20px" }}>
                                    <QuoteIcon />
                                </div>

                                <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
                                    {Array.from({ length: t.stars }).map((_, i) => (
                                        <StarIcon key={i} />
                                    ))}
                                </div>

                                <p
                                    style={{
                                        fontSize: "15px",
                                        color: "#333333",
                                        lineHeight: "1.7",
                                        marginBottom: "24px",
                                        fontStyle: "italic",
                                    }}
                                >
                                    "{t.quote}"
                                </p>

                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

                                    <div className="avatar-circle">{t.initials}</div>
                                    <div>
                                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#111111" }}>
                                            {t.name}
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#888888" }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
          @media (max-width: 1024px) {
            .testimonials-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 640px) {
            .testimonials-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
            </section>

            <section
                style={{
                    background: "linear-gradient(135deg, #E02020 0%, #B01818 100%)",
                    padding: "64px 0",
                }}
            >
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "0",
                        }}
                        className="stats-grid"
                    >
                        {stats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="stat-card"
                                style={{
                                    borderRight: index < stats.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "clamp(32px, 4vw, 48px)",
                                        fontWeight: "800",
                                        color: "#ffffff",
                                        lineHeight: "1",
                                        marginBottom: "8px",
                                    }}
                                >
                                    {stat.number}
                                </div>
                                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: "1.4" }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            .stats-grid > div {
              border-right: none !important;
              border-bottom: 1px solid rgba(255,255,255,0.2);
            }
            .stats-grid > div:nth-child(odd) {
              border-right: 1px solid rgba(255,255,255,0.2) !important;
            }
            .stats-grid > div:last-child,
            .stats-grid > div:nth-last-child(2) {
              border-bottom: none !important;
            }
          }
        `}</style>
            </section>

            <section id="contact" className="cta-section" style={{ padding: "100px 0" }}>
                <div
                    style={{
                        maxWidth: "720px",
                        margin: "0 auto",
                        padding: "0 24px",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            width: "72px",
                            height: "72px",
                            background: "rgba(224,32,32,0.15)",
                            borderRadius: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 28px",
                            border: "1px solid rgba(224,32,32,0.3)",
                        }}
                    >
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M18 3L5 9V18C5 25.2 10.8 31.9 18 33.5C25.2 31.9 31 25.2 31 18V9L18 3Z"
                                fill="rgba(224,32,32,0.3)"
                                stroke="#E02020"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M12 18L15.5 21.5L24 13"
                                stroke="#E02020"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <h2
                        style={{
                            fontSize: "clamp(28px, 4vw, 44px)",
                            fontWeight: "800",
                            color: "#ffffff",
                            marginBottom: "16px",
                            lineHeight: "1.2",
                        }}
                    >
                        Bắt đầu bảo vệ sinh viên của bạn ngay hôm nay
                    </h2>

                    <p
                        style={{
                            fontSize: "17px",
                            color: "#AAAAAA",
                            marginBottom: "40px",
                            lineHeight: "1.6",
                        }}
                    >
                        Miễn phí cho các trường đại học trong giai đoạn thử nghiệm.
                        Không cần thẻ tín dụng, không cam kết dài hạn.
                    </p>

                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                        <Link to="/signin" className="btn-primary" style={{ fontSize: "16px", padding: "14px 32px" }}>
                            Đăng ký dùng thử <ArrowRightIcon />
                        </Link>
                        <button
                            className="btn-secondary"
                            style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.2)", fontSize: "16px", padding: "14px 32px" }}
                            onClick={() => scrollToSection("features")}
                        >
                            Tìm hiểu thêm
                        </button>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: "24px",
                            justifyContent: "center",
                            marginTop: "40px",
                            flexWrap: "wrap",
                        }}
                    >
                        {[
                            "Bảo mật dữ liệu",
                            "Hỗ trợ 24/7",
                            "Cài đặt trong 5 phút",
                        ].map((badge) => (
                            <div
                                key={badge}
                                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            >
                                <CheckIcon />
                                <span style={{ fontSize: "14px", color: "#AAAAAA" }}>{badge}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <footer className="lp-footer" style={{ padding: "48px 0 32px" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1.5fr 1fr 1fr",
                            gap: "48px",
                            marginBottom: "48px",
                            paddingBottom: "48px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                        className="footer-grid"
                    >
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                <ShieldIcon />
                                <span style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>
                                    AI-<span style={{ color: "#E02020" }}>Advisor</span>
                                </span>
                            </div>
                            <p style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: "1.7", maxWidth: "280px" }}>
                                Nền tảng AI hỗ trợ cố vấn học tập — phát hiện sớm sinh viên nguy cơ, can thiệp kịp thời.
                            </p>
                        </div>

                        <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Sản phẩm
                            </div>
                            {[
                                { label: "Tính năng", id: "features" },
                                { label: "Cách hoạt động", id: "how-it-works" },
                                { label: "Đánh giá", id: "testimonials" },
                            ].map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollToSection(link.id)}
                                    className="footer-link"
                                    style={{
                                        display: "block",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "6px 0",
                                        textAlign: "left",
                                    }}
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>

                        <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Hỗ trợ
                            </div>
                            {[
                                { label: "Liên hệ", href: "#contact" },
                                { label: "Chính sách bảo mật", href: "#" },
                                { label: "Điều khoản sử dụng", href: "#" },
                            ].map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="footer-link"
                                    style={{ display: "block", padding: "6px 0" }}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "12px",
                        }}
                    >
                        <p style={{ fontSize: "13px", color: "#6B7280" }}>
                            © 2026 AI-Advisor. Đại học Duy Tân - C2SE.52.
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                                style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: "#12B76A",
                                }}
                            />
                            <span style={{ fontSize: "13px", color: "#6B7280" }}>
                                Hệ thống đang hoạt động
                            </span>
                        </div>
                    </div>
                </div>

                <style>{`
          @media (max-width: 768px) {
            .footer-grid {
              grid-template-columns: 1fr !important;
              gap: 32px !important;
            }
          }
        `}</style>
            </footer>
        </div>
    );
}
