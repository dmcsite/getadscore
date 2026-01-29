"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { jsPDF } from "jspdf";

interface Category {
  name: string;
  score: number;
  reason: string;
}

interface HookAnalysis {
  firstFrameScore: number;
  firstFrameAnalysis: string;
  threeSecondScore: number;
  threeSecondAnalysis: string;
  hookRecommendation: string;
}

interface VideoNotes {
  pacing: string;
  textTiming: string;
  ctaTiming: string;
  textOverlayVerdict?: string;
  endCardAnalysis?: string;
}

interface AudioAnalysis {
  hasVoiceover: boolean;
  voiceoverStartsEarly: boolean;
  openingLine: string | null;
  transcript: string | null;
  audioHookScore: number;
  audioHookAssessment: string;
  isMusicOnly?: boolean;
}

interface ExtractedFrame {
  timestamp: number;
  base64: string;
}

interface CopyAnalysis {
  primaryTextScore: number;
  primaryTextAnalysis: string;
  headlineScore: number;
  headlineAnalysis: string;
  copyCreativeAlignment: number;
  copyCreativeAlignmentReason: string;
  copyFixes: string[];
  primaryTextProvided: string;
  headlineProvided: string;
  descriptionProvided?: string;
}

interface QuickAudit {
  offerMentioned: boolean;
  urgencyPresent: boolean;
  endCardPresent?: boolean; // Only for video
}

interface ExecutiveSummary {
  biggestStrength: string;
  biggestRisk: string;
  quickWin: string;
}

interface ScoreExplanation {
  scoreDriver: string;
  scoreDrag: string;
}

interface ScoreResult {
  overallScore: number;
  mediaType?: "image" | "video";
  quickAudit?: QuickAudit;
  hookAnalysis?: HookAnalysis;
  videoNotes?: VideoNotes;
  audioAnalysis?: AudioAnalysis;
  copyAnalysis?: CopyAnalysis;
  extractedFrames?: ExtractedFrame[];
  thumbnail?: string;
  analyzedAt?: string;
  categories: Category[];
  policyFlags: string[];
  topFixes: string[];
  verdictReason: string;
  whatsWorking: string;
  executiveSummary?: ExecutiveSummary;
  scoreExplanation?: ScoreExplanation;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [zoomedFrame, setZoomedFrame] = useState<ExtractedFrame | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [brandName, setBrandName] = useState("Your Brand");
  const [showFullText, setShowFullText] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram" | "tiktok">("facebook");

  // Collapsible section states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hookAnalysis: true,
    scoreBreakdown: true,
    copyAnalysis: false,
    audioAnalysis: false,
    videoNotes: false,
    topFixes: false,
    whatsWorking: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFile = useCallback((file: File) => {
    const isImageFile = IMAGE_TYPES.includes(file.type);
    const isVideoFile = VIDEO_TYPES.includes(file.type);

    // Validate file type
    if (!isImageFile && !isVideoFile) {
      setError("Please upload an image (JPG, PNG, WebP, GIF) or video (MP4, MOV, WebM).");
      return;
    }

    // Validate file size
    const maxImageSize = 20 * 1024 * 1024; // 20MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB
    const maxSize = isVideoFile ? maxVideoSize : maxImageSize;

    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${isVideoFile ? "50MB" : "20MB"}.`);
      return;
    }

    // Create preview and store file
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsVideo(isVideoFile);
    setPendingFile(file);
    setError(null);
    setResult(null);
  }, []);

  const submitAnalysis = useCallback(async () => {
    if (!pendingFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      // Add ad copy if provided
      if (primaryText.trim()) {
        formData.append("primaryText", primaryText.trim());
      }
      if (headline.trim()) {
        formData.append("headline", headline.trim());
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      const response = await fetch("/api/score", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze file");
      }

      setResult(data);
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pendingFile, primaryText, headline, description]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const reset = useCallback(() => {
    setResult(null);
    setPreviewUrl(null);
    setError(null);
    setIsVideo(false);
    setZoomedFrame(null);
    setPendingFile(null);
    setPrimaryText("");
    setHeadline("");
    setDescription("");
    setBrandName("Your Brand");
    setShowFullText(false);
    setPreviewPlatform("facebook");
    setExpandedSections({
      hookAnalysis: true,
      scoreBreakdown: true,
      copyAnalysis: false,
      audioAnalysis: false,
      videoNotes: false,
      topFixes: false,
      whatsWorking: false,
    });
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getCategoryScoreColor = (score: number) => {
    if (score >= 7) return "bg-green-500/20 text-green-400";
    if (score >= 5) return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  // Score-based verdict thresholds
  const getVerdictFromScore = (score: number) => {
    if (score >= 85) return "SCALE_CANDIDATE";
    if (score >= 75) return "READY_TO_TEST";
    if (score >= 60) return "FIX_BEFORE_SPEND";
    return "DO_NOT_LAUNCH";
  };

  const getVerdictStyles = (score: number) => {
    if (score >= 85) {
      return {
        bg: "bg-gradient-to-r from-green-500/20 to-yellow-500/20 border-green-400/50",
        text: "text-green-300",
        icon: "🚀",
        label: "SCALE CANDIDATE",
        description: "Strong performer. Prioritize for scaling.",
      };
    }
    if (score >= 75) {
      return {
        bg: "bg-green-500/10 border-green-500/30",
        text: "text-green-400",
        icon: "✓",
        label: "READY TO TEST",
        description: "Solid creative. Worth testing with budget.",
      };
    }
    if (score >= 60) {
      return {
        bg: "bg-yellow-500/10 border-yellow-500/30",
        text: "text-yellow-400",
        icon: "⚠",
        label: "FIX BEFORE SPEND",
        description: "Has potential but needs work. Address top fixes first.",
      };
    }
    return {
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-400",
      icon: "✕",
      label: "DO NOT LAUNCH",
      description: "Critical issues will waste ad spend. Fix before testing.",
    };
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Truncate text for Facebook preview (125 chars)
  const truncateText = (text: string, maxLength: number = 125): { truncated: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { truncated: text, isTruncated: false };
    }
    return { truncated: text.substring(0, maxLength).trim(), isTruncated: true };
  };

  // Get thumbnail for preview (first frame for video, or image itself)
  const getPreviewThumbnail = (): string | null => {
    if (result?.extractedFrames && result.extractedFrames.length > 0) {
      return `data:image/jpeg;base64,${result.extractedFrames[0].base64}`;
    }
    if (result?.thumbnail) {
      return `data:image/jpeg;base64,${result.thumbnail}`;
    }
    return previewUrl;
  };

  // Facebook Ad Preview Component
  const FacebookAdPreview = () => {
    const displayPrimaryText = result?.copyAnalysis?.primaryTextProvided || primaryText;
    const displayHeadline = result?.copyAnalysis?.headlineProvided || headline;
    const displayDescription = result?.copyAnalysis?.descriptionProvided || description;
    const thumbnailUrl = getPreviewThumbnail();
    const { truncated, isTruncated } = truncateText(displayPrimaryText);

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm">
              {brandName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{brandName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Sponsored ·
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H8l5-7v4h3l-5 7z"/>
                </svg>
              </p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
        </div>

        {/* Primary Text */}
        {displayPrimaryText && (
          <div className="px-3 pb-3">
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
              {showFullText || !isTruncated ? displayPrimaryText : truncated}
              {isTruncated && !showFullText && (
                <button
                  onClick={() => setShowFullText(true)}
                  className="text-gray-500 hover:underline ml-1"
                >
                  ... See more
                </button>
              )}
            </p>
          </div>
        )}

        {/* Creative - Video Player or Image */}
        <div className="relative bg-gray-100">
          {(result?.mediaType === "video" || isVideo) && previewUrl ? (
            <video
              src={previewUrl}
              controls
              poster={thumbnailUrl || undefined}
              className="w-full object-contain"
              style={{ maxHeight: '350px' }}
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Ad creative"
              className="w-full object-cover"
              style={{ maxHeight: '400px' }}
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No preview available</span>
            </div>
          )}
        </div>

        {/* Link Preview / CTA Section */}
        {(displayHeadline || displayDescription) && (
          <div className="bg-gray-50 p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {displayHeadline && (
                <p className="text-sm font-semibold text-gray-900 truncate">{displayHeadline}</p>
              )}
              {displayDescription && (
                <p className="text-xs text-gray-500 truncate">{displayDescription}</p>
              )}
            </div>
            <button
              className="px-4 py-2 text-sm font-semibold rounded-md flex-shrink-0"
              style={{ backgroundColor: '#1877F2', color: 'white' }}
            >
              Learn More
            </button>
          </div>
        )}

        {/* Engagement Bar */}
        <div className="px-3 py-2 border-t border-gray-200">
          <div className="flex items-center justify-around text-gray-500">
            <button className="flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              <span className="text-sm font-medium">Like</span>
            </button>
            <button className="flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-sm font-medium">Comment</span>
            </button>
            <button className="flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Instagram Ad Preview Component
  const InstagramAdPreview = () => {
    const displayPrimaryText = result?.copyAnalysis?.primaryTextProvided || primaryText;
    const thumbnailUrl = getPreviewThumbnail();

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Instagram gradient ring around profile */}
            <div className="w-9 h-9 rounded-full p-0.5" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
              <div className="w-full h-full rounded-full bg-white p-0.5">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xs">
                  {brandName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{brandName.toLowerCase().replace(/\s+/g, '')}</p>
              <p className="text-xs text-gray-500">Sponsored</p>
            </div>
          </div>
          <button className="text-gray-900 p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
        </div>

        {/* Creative - Video Player or Image (square aspect for IG feed) */}
        <div className="relative bg-gray-100">
          {(result?.mediaType === "video" || isVideo) && previewUrl ? (
            <video
              src={previewUrl}
              controls
              poster={thumbnailUrl || undefined}
              className="w-full object-cover aspect-square"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Ad creative"
              className="w-full object-cover aspect-square"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No preview available</span>
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Heart */}
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {/* Comment */}
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            {/* Share */}
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          {/* Bookmark */}
          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>

        {/* Likes */}
        <div className="px-3 pb-1">
          <p className="text-sm font-semibold text-gray-900">1,234 likes</p>
        </div>

        {/* Caption */}
        {displayPrimaryText && (
          <div className="px-3 pb-3">
            <p className="text-sm text-gray-900">
              <span className="font-semibold">{brandName.toLowerCase().replace(/\s+/g, '')}</span>{' '}
              {displayPrimaryText.length > 100 ? displayPrimaryText.substring(0, 100) + '...' : displayPrimaryText}
            </p>
          </div>
        )}

        {/* CTA Button */}
        <div className="px-3 pb-3">
          <button className="w-full py-2 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: '#0095F6' }}>
            Learn More
          </button>
        </div>
      </div>
    );
  };

  // TikTok Ad Preview Component
  const TikTokAdPreview = () => {
    const displayPrimaryText = result?.copyAnalysis?.primaryTextProvided || primaryText;
    const thumbnailUrl = getPreviewThumbnail();

    return (
      <div className="relative bg-black rounded-2xl shadow-lg overflow-hidden max-w-[280px] mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', aspectRatio: '9/16' }}>
        {/* Video/Image Background */}
        <div className="absolute inset-0">
          {(result?.mediaType === "video" || isVideo) && previewUrl ? (
            <video
              src={previewUrl}
              controls
              poster={thumbnailUrl || undefined}
              className="w-full h-full object-cover"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Ad creative"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500">No preview</span>
            </div>
          )}
        </div>

        {/* Gradient overlay for text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Sponsored label */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-0.5 text-xs font-medium text-white bg-black/40 rounded">Sponsored</span>
        </div>

        {/* Right side icons */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
          {/* Profile */}
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
              {brandName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
          </div>
          {/* Heart */}
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 text-white" fill="white" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-white text-xs mt-1">12.3K</span>
          </div>
          {/* Comment */}
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 text-white" fill="white" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span className="text-white text-xs mt-1">234</span>
          </div>
          {/* Bookmark */}
          <div className="flex flex-col items-center">
            <svg className="w-7 h-7 text-white" fill="white" viewBox="0 0 24 24">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-white text-xs mt-1">1.2K</span>
          </div>
          {/* Share */}
          <div className="flex flex-col items-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
            <span className="text-white text-xs mt-1">Share</span>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-3 left-3 right-16">
          {/* Username */}
          <p className="text-white font-semibold text-sm mb-1">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
          {/* Caption */}
          {displayPrimaryText && (
            <p className="text-white text-xs leading-relaxed line-clamp-2">
              {displayPrimaryText.length > 80 ? displayPrimaryText.substring(0, 80) + '...' : displayPrimaryText}
            </p>
          )}
          {/* CTA Button */}
          <button className="mt-2 px-4 py-1.5 text-xs font-semibold text-white rounded-sm" style={{ backgroundColor: '#FE2C55' }}>
            Learn More
          </button>
          {/* Sound */}
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-3 h-3 text-white" fill="white" viewBox="0 0 24 24">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <p className="text-white text-xs truncate">Original Sound - {brandName}</p>
          </div>
        </div>
      </div>
    );
  };

  const generatePDF = useCallback(async () => {
    if (!result) return;

    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 0;

      // Brand colors
      const brandGreen = [34, 197, 94]; // #22c55e
      const brandDark = [24, 24, 27]; // #18181b
      const textDark = [39, 39, 42]; // #27272a
      const textMuted = [113, 113, 122]; // #71717a

      // Helper to add footer
      const addFooter = (pageNum: number, totalPages: number) => {
        pdf.setFontSize(8);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        pdf.text("Generated by GetAdScore.com", margin, pageHeight - 10);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      };

      // Helper to add new page if needed
      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - 25) {
          pdf.addPage();
          yPos = 20;
        }
      };

      // Helper for section headers
      const addSectionHeader = (title: string) => {
        checkPageBreak(15);
        // Green accent bar
        pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.rect(margin, yPos, 3, 8, 'F');
        // Title
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text(title, margin + 6, yPos + 6);
        pdf.setFont('helvetica', 'normal');
        yPos += 12;
      };

      // Helper for divider line
      const addDivider = () => {
        pdf.setDrawColor(228, 228, 231);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      };

      // ========== PAGE 1: CREATIVE DECISION SCORECARD ==========

      // Header bar - dark with green accent
      pdf.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.rect(0, 18, pageWidth, 1, 'F');

      // Logo
      pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.roundedRect(margin, 4, 8, 8, 1.5, 1.5, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text("G", margin + 2.8, 10);
      pdf.setFontSize(12);
      pdf.text("GetAdScore", margin + 10, 10);

      // Date + Brand right-aligned
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(161, 161, 170);
      const dateStr = new Date(result.analyzedAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      pdf.text(dateStr, pageWidth - margin - pdf.getTextWidth(dateStr), 10);

      // Client/Brand line (optional header)
      pdf.setFontSize(7);
      pdf.text(`Brand: ${brandName}`, pageWidth - margin - pdf.getTextWidth(`Brand: ${brandName}`), 15);

      yPos = 22;

      // ========== SCORE + VERDICT HEADER (Compact single line) ==========
      const scoreColor = result.overallScore >= 75 ? brandGreen : result.overallScore >= 60 ? [234, 179, 8] : [239, 68, 68];
      const pdfVerdictStyles = getVerdictStyles(result.overallScore);
      let verdictBgColor: number[], verdictTextColor: number[];
      if (result.overallScore >= 75) {
        verdictBgColor = [220, 252, 231]; verdictTextColor = [22, 101, 52];
      } else if (result.overallScore >= 60) {
        verdictBgColor = [254, 249, 195]; verdictTextColor = [133, 77, 14];
      } else {
        verdictBgColor = [254, 226, 226]; verdictTextColor = [153, 27, 27];
      }

      // Score + Verdict row
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'FD');

      // Score number (left)
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.text(`${result.overallScore}`, margin + 6, yPos + 13);
      pdf.setFontSize(10);
      pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      pdf.text("/100", margin + 22, yPos + 13);

      // Verdict badge (center-left)
      const badgeX = margin + 42;
      pdf.setFillColor(verdictBgColor[0], verdictBgColor[1], verdictBgColor[2]);
      pdf.roundedRect(badgeX, yPos + 4, 52, 10, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(verdictTextColor[0], verdictTextColor[1], verdictTextColor[2]);
      pdf.text(pdfVerdictStyles.label, badgeX + 4, yPos + 11);
      pdf.setFont('helvetica', 'normal');

      // Verdict description (right)
      pdf.setFontSize(8);
      pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      pdf.text(pdfVerdictStyles.description, badgeX + 58, yPos + 11);

      yPos += 22;

      // ========== AD PREVIEW (Compact) ==========
      const cardX = margin;
      const cardWidth = contentWidth * 0.55; // Left side - smaller preview
      const infoX = margin + cardWidth + 6; // Right side - info
      const infoWidth = contentWidth - cardWidth - 6;
      const cardHeight = 75;

      // Ad preview card (left)
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(cardX, yPos, cardWidth, cardHeight, 3, 3, 'FD');

      // Thumbnail
      const thumbnailData = result.extractedFrames?.[0]?.base64 || result.thumbnail;
      const imgAreaHeight = cardHeight - 4;

      if (thumbnailData && thumbnailData.length > 100) {
        try {
          const loadImage = (): Promise<{ dataUrl: string; width: number; height: number }> => {
            return new Promise((resolve, reject) => {
              const img = new window.Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
                } else reject(new Error('No context'));
              };
              img.onerror = () => reject(new Error('Load failed'));
              img.src = `data:image/jpeg;base64,${thumbnailData}`;
            });
          };
          const { dataUrl: pngDataUrl, width: naturalWidth, height: naturalHeight } = await loadImage();
          const aspectRatio = naturalWidth / naturalHeight;
          let finalWidth = cardWidth - 4;
          let finalHeight = finalWidth / aspectRatio;
          if (finalHeight > imgAreaHeight) {
            finalHeight = imgAreaHeight;
            finalWidth = imgAreaHeight * aspectRatio;
          }
          const imgX = cardX + 2 + (cardWidth - 4 - finalWidth) / 2;
          pdf.setFillColor(240, 240, 240);
          pdf.rect(cardX + 2, yPos + 2, cardWidth - 4, imgAreaHeight, 'F');
          pdf.addImage(pngDataUrl, 'PNG', imgX, yPos + 2, finalWidth, finalHeight);
        } catch {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(cardX + 2, yPos + 2, cardWidth - 4, imgAreaHeight, 'F');
        }
      } else {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(cardX + 2, yPos + 2, cardWidth - 4, imgAreaHeight, 'F');
      }

      // Play button for video
      if (result.mediaType === "video") {
        const centerX = cardX + cardWidth / 2;
        const centerY = yPos + cardHeight / 2;
        pdf.setFillColor(0, 0, 0);
        pdf.circle(centerX, centerY, 8, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.triangle(centerX - 2, centerY - 4, centerX - 2, centerY + 4, centerX + 4, centerY, 'F');
      }

      // Info panel (right side)
      // Quick Audit as compact checklist
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
      pdf.text("QUICK AUDIT", infoX, yPos + 6);
      pdf.setFont('helvetica', 'normal');

      let auditY = yPos + 12;
      const auditItems = [
        { label: "Offer", value: result.quickAudit?.offerMentioned },
        { label: "Urgency", value: result.quickAudit?.urgencyPresent },
        { label: "CTA", value: (result.categories.find(c => c.name === 'CTA Strength')?.score || 0) >= 7 },
      ];
      if (result.mediaType === 'video' && result.quickAudit?.endCardPresent !== undefined) {
        auditItems.splice(2, 0, { label: "End Card", value: result.quickAudit.endCardPresent });
      }

      pdf.setFontSize(8);
      auditItems.forEach((item) => {
        if (item.value) {
          pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
          pdf.text("OK", infoX, auditY);
        } else {
          pdf.setTextColor(239, 68, 68);
          pdf.text("--", infoX, auditY);
        }
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text(item.label, infoX + 10, auditY);
        auditY += 5;
      });

      // Score breakdown mini (right side, below audit)
      auditY += 3;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
      pdf.text("KEY SCORES", infoX, auditY);
      pdf.setFont('helvetica', 'normal');
      auditY += 5;

      const keyCategories = ['Thumb-Stop Power', 'Hook Clarity', 'CTA Strength'];
      keyCategories.forEach((catName) => {
        const cat = result.categories.find(c => c.name === catName);
        if (cat) {
          const catColor = cat.score >= 7 ? brandGreen : cat.score >= 5 ? [234, 179, 8] : [239, 68, 68];
          pdf.setTextColor(catColor[0], catColor[1], catColor[2]);
          pdf.setFontSize(8);
          pdf.text(`${cat.score}`, infoX, auditY);
          pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          pdf.setFontSize(7);
          pdf.text(catName.replace(' Power', '').replace(' Clarity', '').replace(' Strength', ''), infoX + 8, auditY);
          auditY += 5;
        }
      });

      yPos += cardHeight + 6;

      // ========== EXECUTIVE SUMMARY (Compact horizontal) ==========
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'FD');

      const summaryY = yPos + 4;
      const colWidth = contentWidth / 3;

      // Strength
      pdf.setFillColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.circle(margin + 4, summaryY + 3, 1.5, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
      pdf.text("Strength", margin + 8, summaryY + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
      const strengthText = result.executiveSummary?.biggestStrength || '';
      pdf.text(strengthText.length > 35 ? strengthText.substring(0, 32) + '...' : strengthText, margin + 4, summaryY + 10);

      // Risk
      const riskX = margin + colWidth;
      pdf.setFillColor(239, 68, 68);
      pdf.circle(riskX + 4, summaryY + 3, 1.5, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(239, 68, 68);
      pdf.text("Risk", riskX + 8, summaryY + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
      const riskText = result.executiveSummary?.biggestRisk || '';
      pdf.text(riskText.length > 35 ? riskText.substring(0, 32) + '...' : riskText, riskX + 4, summaryY + 10);

      // Quick Win
      const winX = margin + colWidth * 2;
      pdf.setFillColor(59, 130, 246);
      pdf.circle(winX + 4, summaryY + 3, 1.5, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text("Quick Win", winX + 8, summaryY + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
      const winText = result.executiveSummary?.quickWin || '';
      pdf.text(winText.length > 30 ? winText.substring(0, 27) + '...' : winText, winX + 4, summaryY + 10);

      yPos += 20;

      // ========== BIGGEST FIX BEFORE SCALING (Callout) ==========
      if (result.topFixes && result.topFixes.length > 0) {
        pdf.setFillColor(254, 243, 199); // Amber-100
        pdf.setDrawColor(251, 191, 36); // Amber-400
        pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'FD');

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(180, 83, 9); // Amber-700
        pdf.text("FIX BEFORE SCALING:", margin + 4, yPos + 9);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        const fixText = result.topFixes[0];
        pdf.text(fixText.length > 80 ? fixText.substring(0, 77) + '...' : fixText, margin + 42, yPos + 9);

        yPos += 18;
      }

      // ========== SCORE DRIVER/DRAG (Compact line) ==========
      if (result.scoreExplanation) {
        pdf.setFontSize(7);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const explainText = `Score driven by ${result.scoreExplanation.scoreDriver} | Held back by ${result.scoreExplanation.scoreDrag}`;
        const explainWidth = pdf.getTextWidth(explainText);
        pdf.text(explainText, margin + (contentWidth - explainWidth) / 2, yPos + 4);
        yPos += 10;
      }

      // ========== NEW PAGE FOR DETAILED ANALYSIS ==========
      pdf.addPage();
      yPos = 25;

      // Hook Analysis (Video)
      if (result.hookAnalysis) {
        addSectionHeader("Hook Analysis (First 3 Seconds)");

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        const firstFrameScoreColor = result.hookAnalysis.firstFrameScore >= 7 ? brandGreen : result.hookAnalysis.firstFrameScore >= 5 ? [234, 179, 8] : [239, 68, 68];
        pdf.setTextColor(firstFrameScoreColor[0], firstFrameScoreColor[1], firstFrameScoreColor[2]);
        pdf.text(`${result.hookAnalysis.firstFrameScore}/10`, margin, yPos);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text("First Frame Score", margin + 12, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const firstFrameLines = pdf.splitTextToSize(result.hookAnalysis.firstFrameAnalysis, contentWidth);
        pdf.text(firstFrameLines, margin, yPos);
        yPos += firstFrameLines.length * 4.5 + 5;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const threeSecScoreColor = result.hookAnalysis.threeSecondScore >= 7 ? brandGreen : result.hookAnalysis.threeSecondScore >= 5 ? [234, 179, 8] : [239, 68, 68];
        pdf.setTextColor(threeSecScoreColor[0], threeSecScoreColor[1], threeSecScoreColor[2]);
        pdf.text(`${result.hookAnalysis.threeSecondScore}/10`, margin, yPos);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text("3-Second Hook Score", margin + 12, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const hookLines = pdf.splitTextToSize(result.hookAnalysis.threeSecondAnalysis, contentWidth);
        pdf.text(hookLines, margin, yPos);
        yPos += hookLines.length * 4.5 + 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.text("Recommendation:", margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const recLines = pdf.splitTextToSize(result.hookAnalysis.hookRecommendation, contentWidth);
        pdf.text(recLines, margin, yPos);
        yPos += recLines.length * 4.5 + 8;
        addDivider();
      }

      // Category Breakdown
      checkPageBreak(20 + result.categories.length * 18);
      addSectionHeader("Score Breakdown");

      result.categories.forEach((category) => {
        checkPageBreak(18);
        const catScoreColor = category.score >= 7 ? brandGreen : category.score >= 5 ? [234, 179, 8] : [239, 68, 68];
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(catScoreColor[0], catScoreColor[1], catScoreColor[2]);
        pdf.text(`${category.score}/10`, margin, yPos);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text(category.name, margin + 14, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const reasonLines = pdf.splitTextToSize(category.reason, contentWidth - 14);
        pdf.text(reasonLines, margin + 14, yPos);
        yPos += reasonLines.length * 4 + 5;
      });

      yPos += 4;
      addDivider();

      // Audio Analysis (Video)
      if (result.audioAnalysis) {
        checkPageBreak(40);
        addSectionHeader("Audio Analysis");

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text(`Voiceover: ${result.audioAnalysis.hasVoiceover ? "Detected" : "None (music/ambient only)"}`, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;

        if (result.audioAnalysis.hasVoiceover) {
          const audioScoreColor = result.audioAnalysis.audioHookScore >= 7 ? brandGreen : result.audioAnalysis.audioHookScore >= 5 ? [234, 179, 8] : [239, 68, 68];
          pdf.setTextColor(audioScoreColor[0], audioScoreColor[1], audioScoreColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${result.audioAnalysis.audioHookScore}/10`, margin, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
          pdf.text("Audio Hook Score", margin + 14, yPos);
          yPos += 6;
          if (result.audioAnalysis.openingLine) {
            pdf.setFontSize(9);
            pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            const openingLines = pdf.splitTextToSize(`Opening Line: "${result.audioAnalysis.openingLine}"`, contentWidth);
            pdf.text(openingLines, margin, yPos);
            yPos += openingLines.length * 4.5 + 4;
          }
        }

        pdf.setFontSize(9);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const audioAssessLines = pdf.splitTextToSize(result.audioAnalysis.audioHookAssessment, contentWidth);
        pdf.text(audioAssessLines, margin, yPos);
        yPos += audioAssessLines.length * 4.5 + 6;
        addDivider();
      }

      // Ad Copy Analysis
      if (result.copyAnalysis) {
        checkPageBreak(60);
        addSectionHeader("Ad Copy Analysis");

        // Scores row
        pdf.setFontSize(9);
        const primaryScoreColor = result.copyAnalysis.primaryTextScore >= 7 ? brandGreen : result.copyAnalysis.primaryTextScore >= 5 ? [234, 179, 8] : [239, 68, 68];
        const headlineScoreColor = result.copyAnalysis.headlineScore >= 7 ? brandGreen : result.copyAnalysis.headlineScore >= 5 ? [234, 179, 8] : [239, 68, 68];
        const alignmentScoreColor = result.copyAnalysis.copyCreativeAlignment >= 7 ? brandGreen : result.copyAnalysis.copyCreativeAlignment >= 5 ? [234, 179, 8] : [239, 68, 68];

        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text("Primary Text: ", margin, yPos);
        pdf.setTextColor(primaryScoreColor[0], primaryScoreColor[1], primaryScoreColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${result.copyAnalysis.primaryTextScore}/10`, margin + 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        pdf.text("|", margin + 38, yPos);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text("Headline: ", margin + 43, yPos);
        pdf.setTextColor(headlineScoreColor[0], headlineScoreColor[1], headlineScoreColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${result.copyAnalysis.headlineScore}/10`, margin + 62, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        pdf.text("|", margin + 75, yPos);
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        pdf.text("Alignment: ", margin + 80, yPos);
        pdf.setTextColor(alignmentScoreColor[0], alignmentScoreColor[1], alignmentScoreColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${result.copyAnalysis.copyCreativeAlignment}/10`, margin + 102, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 8;

        // Provided copy
        if (result.copyAnalysis.primaryTextProvided) {
          checkPageBreak(20);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
          pdf.text("Primary Text:", margin, yPos);
          pdf.setFont('helvetica', 'normal');
          yPos += 4;
          pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          const primaryLines = pdf.splitTextToSize(`"${result.copyAnalysis.primaryTextProvided}"`, contentWidth);
          pdf.text(primaryLines.slice(0, 2), margin, yPos);
          yPos += primaryLines.slice(0, 2).length * 4 + 4;
        }

        // Analysis
        pdf.setFontSize(9);
        pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const primaryAnalysisLines = pdf.splitTextToSize(result.copyAnalysis.primaryTextAnalysis, contentWidth);
        pdf.text(primaryAnalysisLines, margin, yPos);
        yPos += primaryAnalysisLines.length * 4 + 3;

        const headlineAnalysisLines = pdf.splitTextToSize(result.copyAnalysis.headlineAnalysis, contentWidth);
        pdf.text(headlineAnalysisLines, margin, yPos);
        yPos += headlineAnalysisLines.length * 4 + 3;

        const alignmentLines = pdf.splitTextToSize(result.copyAnalysis.copyCreativeAlignmentReason, contentWidth);
        pdf.text(alignmentLines, margin, yPos);
        yPos += alignmentLines.length * 4 + 5;

        // Copy fixes
        if (result.copyAnalysis.copyFixes && result.copyAnalysis.copyFixes.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
          pdf.text("Suggested Fixes:", margin, yPos);
          pdf.setFont('helvetica', 'normal');
          yPos += 5;
          result.copyAnalysis.copyFixes.forEach((fix) => {
            checkPageBreak(10);
            pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            const fixLines = pdf.splitTextToSize(`- ${fix}`, contentWidth - 5);
            pdf.text(fixLines, margin + 3, yPos);
            yPos += fixLines.length * 4 + 2;
          });
        }
        yPos += 4;
        addDivider();
      }

      // Top 3 Fixes
      checkPageBreak(40);
      addSectionHeader("Top 3 Fixes");

      result.topFixes.forEach((fix, i) => {
        checkPageBreak(15);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(brandGreen[0], brandGreen[1], brandGreen[2]);
        pdf.text(`${i + 1}.`, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(textDark[0], textDark[1], textDark[2]);
        const fixLines = pdf.splitTextToSize(fix, contentWidth - 10);
        pdf.text(fixLines, margin + 8, yPos);
        yPos += fixLines.length * 4.5 + 5;
      });

      yPos += 4;
      addDivider();

      // Policy Flags
      if (result.policyFlags.length > 0) {
        checkPageBreak(20 + result.policyFlags.length * 8);
        // Red accent bar for policy flags
        pdf.setFillColor(239, 68, 68);
        pdf.rect(margin, yPos, 3, 8, 'F');
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(239, 68, 68);
        pdf.text("Policy Flags", margin + 6, yPos + 6);
        pdf.setFont('helvetica', 'normal');
        yPos += 12;

        result.policyFlags.forEach((flag) => {
          checkPageBreak(10);
          pdf.setFontSize(9);
          pdf.setTextColor(153, 27, 27);
          const flagLines = pdf.splitTextToSize(`- ${flag}`, contentWidth);
          pdf.text(flagLines, margin, yPos);
          yPos += flagLines.length * 4.5 + 3;
        });
        yPos += 4;
        addDivider();
      }

      // What's Working
      checkPageBreak(25);
      addSectionHeader("What's Working");
      pdf.setFontSize(10);
      pdf.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const workingLines = pdf.splitTextToSize(result.whatsWorking, contentWidth);
      pdf.text(workingLines, margin, yPos);

      // Add footers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter(i, totalPages);
      }

      // Save PDF
      pdf.save(`getadscore-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0a0a0b]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-lg text-zinc-100">GetAdScore</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#pricing"
              className="text-sm text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              Pricing
            </a>
            {result && (
              <button
                onClick={reset}
                className="text-sm text-zinc-500 hover:text-zinc-100 transition-colors"
              >
                Score another ad
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!result && !pendingFile ? (
          /* Initial Upload Section */
          <div className="fade-in">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
                Score Your Ad Before You Spend
              </h1>
              <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
                AI-powered creative analysis built on 10+ years of media buying experience.
                Know if your ad is test-ready before spending a dollar.
              </p>
            </div>

            {/* Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center
                transition-all duration-300 cursor-pointer
                ${isDragging
                  ? "border-indigo-500 bg-indigo-500/5 upload-zone-active"
                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                }
              `}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-100 font-medium mb-1">
                    Drop your ad image or video here
                  </p>
                  <p className="text-zinc-600 text-sm">
                    Images: JPG, PNG, WebP, GIF (up to 20MB) • Videos: MP4, MOV, WebM (up to 50MB)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Features */}
            <div className="mt-16 grid md:grid-cols-4 gap-6">
              {[
                {
                  title: "8 Scoring Categories",
                  description: "From thumb-stop power to platform nativity",
                  icon: "📊",
                },
                {
                  title: "Video Hook Analysis",
                  description: "Deep dive into the critical first 3 seconds",
                  icon: "🎬",
                },
                {
                  title: "Policy Flag Detection",
                  description: "Catch Meta policy violations before they catch you",
                  icon: "🚩",
                },
                {
                  title: "Actionable Fixes",
                  description: "Specific recommendations, not generic advice",
                  icon: "🔧",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="text-2xl mb-3">{feature.icon}</div>
                  <h3 className="font-semibold mb-1 text-zinc-100">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : !result && pendingFile ? (
          /* Ad Copy Form Section */
          <div className="fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 text-zinc-100">
                Add Your Ad Copy
              </h1>
              <p className="text-zinc-500">
                Optional: Include your ad copy for a complete creative analysis
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Preview */}
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  {isVideo ? (
                    <video
                      src={previewUrl || ""}
                      controls
                      className="w-full object-contain max-h-96"
                    />
                  ) : (
                    <Image
                      src={previewUrl || ""}
                      alt="Ad preview"
                      width={500}
                      height={500}
                      className="w-full object-contain max-h-96"
                    />
                  )}
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Choose different file
                </button>
              </div>

              {/* Right: Ad Copy Form */}
              <div className="space-y-6">
                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Brand / Page Name
                    <span className="text-zinc-600 font-normal ml-2">(for preview)</span>
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Your Brand"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Primary Text */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Primary Text
                    <span className="text-zinc-600 font-normal ml-2">(optional)</span>
                  </label>
                  <textarea
                    value={primaryText}
                    onChange={(e) => setPrimaryText(e.target.value)}
                    placeholder="The main body text of your ad..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  />
                  <p className="mt-1 text-xs text-zinc-600">
                    {primaryText.length} characters
                    {primaryText.length > 125 && (
                      <span className="text-yellow-500 ml-2">
                        (over 125 chars may truncate on mobile)
                      </span>
                    )}
                  </p>
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Headline
                    <span className="text-zinc-600 font-normal ml-2">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Your ad headline..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Description
                    <span className="text-zinc-600 font-normal ml-2">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Link description text..."
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={submitAnalysis}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isVideo ? "Analyzing video..." : "Analyzing ad..."}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Score This Ad
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-zinc-600">
                  {primaryText || headline ? "Ad copy will be analyzed for hook strength, clarity, and creative alignment" : "Skip ad copy to analyze just the creative"}
                </p>
              </div>
            </div>
          </div>
        ) : result ? (
          /* Results Section */
          <div className="fade-in">
            {/* Score & Verdict Header - Above the fold */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Score */}
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="none" className="text-zinc-700" />
                      <circle
                        cx="48" cy="48" r="42"
                        stroke={result.overallScore >= 85 ? "#22c55e" : result.overallScore >= 75 ? "#22c55e" : result.overallScore >= 60 ? "#eab308" : "#ef4444"}
                        strokeWidth="6" fill="none" strokeLinecap="round"
                        strokeDasharray="264"
                        strokeDashoffset={264 - (264 * result.overallScore) / 100}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm uppercase tracking-wide">Overall Score</p>
                    <p className="text-zinc-300 text-sm mt-1">out of 100</p>
                    {result.scoreExplanation && (
                      <p className="text-zinc-500 text-xs mt-2 max-w-[180px]">
                        Score driven by <span className="text-zinc-400">{result.scoreExplanation.scoreDriver}</span>, held back by <span className="text-zinc-400">{result.scoreExplanation.scoreDrag}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Verdict */}
                <div className={`px-6 py-4 rounded-xl border ${getVerdictStyles(result.overallScore).bg}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl`}>
                      {getVerdictStyles(result.overallScore).icon}
                    </span>
                    <div>
                      <p className={`font-bold text-lg ${getVerdictStyles(result.overallScore).text}`}>
                        {getVerdictStyles(result.overallScore).label}
                      </p>
                      <p className="text-zinc-400 text-sm max-w-md">{getVerdictStyles(result.overallScore).description}</p>
                    </div>
                  </div>
                </div>

                {/* Media Type Badge */}
                {result.mediaType && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    result.mediaType === "video"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {result.mediaType === "video" ? "Video Ad" : "Image Ad"}
                  </span>
                )}
              </div>
            </div>

            {/* Executive Summary Block */}
            {result.executiveSummary && (
              <div className="mb-6 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-sm mt-0.5">●</span>
                    <div>
                      <span className="text-zinc-500 text-sm">Biggest Strength: </span>
                      <span className="text-zinc-200 text-sm">{result.executiveSummary.biggestStrength}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-sm mt-0.5">●</span>
                    <div>
                      <span className="text-zinc-500 text-sm">Biggest Risk: </span>
                      <span className="text-zinc-200 text-sm">{result.executiveSummary.biggestRisk}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-400 text-sm mt-0.5">●</span>
                    <div>
                      <span className="text-zinc-500 text-sm">Quick Win: </span>
                      <span className="text-zinc-200 text-sm">{result.executiveSummary.quickWin}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Audit Panel */}
            {result.quickAudit && (
              <div className="mb-8 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">Quick Audit</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Offer Mentioned */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${result.quickAudit.offerMentioned ? 'bg-green-500/10 border border-green-500/30' : 'bg-zinc-800/50 border border-zinc-700'}`}>
                    <span className={result.quickAudit.offerMentioned ? 'text-green-400' : 'text-zinc-500'}>
                      {result.quickAudit.offerMentioned ? '✓' : '✕'}
                    </span>
                    <span className={`text-sm ${result.quickAudit.offerMentioned ? 'text-green-300' : 'text-zinc-400'}`}>Offer</span>
                  </div>

                  {/* Urgency Present */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${result.quickAudit.urgencyPresent ? 'bg-green-500/10 border border-green-500/30' : 'bg-zinc-800/50 border border-zinc-700'}`}>
                    <span className={result.quickAudit.urgencyPresent ? 'text-green-400' : 'text-zinc-500'}>
                      {result.quickAudit.urgencyPresent ? '✓' : '✕'}
                    </span>
                    <span className={`text-sm ${result.quickAudit.urgencyPresent ? 'text-green-300' : 'text-zinc-400'}`}>Urgency</span>
                  </div>

                  {/* End Card (Video only) */}
                  {result.mediaType === 'video' && result.quickAudit.endCardPresent !== undefined && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${result.quickAudit.endCardPresent ? 'bg-green-500/10 border border-green-500/30' : 'bg-zinc-800/50 border border-zinc-700'}`}>
                      <span className={result.quickAudit.endCardPresent ? 'text-green-400' : 'text-zinc-500'}>
                        {result.quickAudit.endCardPresent ? '✓' : '✕'}
                      </span>
                      <span className={`text-sm ${result.quickAudit.endCardPresent ? 'text-green-300' : 'text-zinc-400'}`}>End Card</span>
                    </div>
                  )}

                  {/* CTA Strength (from CTA category score) */}
                  {(() => {
                    const ctaCategory = result.categories.find(c => c.name === 'CTA Strength');
                    const ctaScore = ctaCategory?.score || 0;
                    const ctaStatus = ctaScore >= 7 ? 'strong' : ctaScore >= 4 ? 'weak' : 'missing';
                    return (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        ctaStatus === 'strong' ? 'bg-green-500/10 border border-green-500/30' :
                        ctaStatus === 'weak' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                        'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <span className={
                          ctaStatus === 'strong' ? 'text-green-400' :
                          ctaStatus === 'weak' ? 'text-yellow-400' :
                          'text-red-400'
                        }>
                          {ctaStatus === 'strong' ? '✓' : ctaStatus === 'weak' ? '⚠' : '✕'}
                        </span>
                        <span className={`text-sm ${
                          ctaStatus === 'strong' ? 'text-green-300' :
                          ctaStatus === 'weak' ? 'text-yellow-300' :
                          'text-red-300'
                        }`}>
                          CTA {ctaStatus === 'strong' ? 'Strong' : ctaStatus === 'weak' ? 'Weak' : 'Missing'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Platform Previews */}
              <div className="space-y-6">
                {/* Platform Tabs */}
                <div>
                  <div className="flex rounded-lg bg-zinc-800/50 p-1 mb-4">
                    <button
                      onClick={() => setPreviewPlatform("facebook")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        previewPlatform === "facebook"
                          ? "bg-zinc-700 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </button>
                    <button
                      onClick={() => setPreviewPlatform("instagram")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        previewPlatform === "instagram"
                          ? "bg-zinc-700 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                      Instagram
                    </button>
                    <button
                      onClick={() => setPreviewPlatform("tiktok")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        previewPlatform === "tiktok"
                          ? "bg-zinc-700 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </button>
                  </div>

                  {/* Platform Preview */}
                  {previewPlatform === "facebook" && <FacebookAdPreview />}
                  {previewPlatform === "instagram" && <InstagramAdPreview />}
                  {previewPlatform === "tiktok" && <TikTokAdPreview />}

                  {showFullText && previewPlatform === "facebook" && (
                    <button
                      onClick={() => setShowFullText(false)}
                      className="block mx-auto mt-2 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Show less
                    </button>
                  )}
                </div>

                {/* Extracted Keyframes (Video Only) */}
                {result.extractedFrames && result.extractedFrames.length > 0 && (
                  <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <h2 className="font-semibold mb-4 flex items-center gap-2 text-zinc-100">
                      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
                      Keyframes Analyzed
                      <span className="text-xs text-zinc-500 font-normal ml-auto">
                        {result.extractedFrames.length} frames
                      </span>
                    </h2>
                    <div className="grid grid-cols-5 gap-2">
                      {result.extractedFrames.map((frame, i) => (
                        <button
                          key={i}
                          onClick={() => setZoomedFrame(frame)}
                          className="group relative aspect-video rounded-lg overflow-hidden border border-zinc-700 hover:border-cyan-500 transition-colors cursor-pointer"
                        >
                          <img
                            src={`data:image/jpeg;base64,${frame.base64}`}
                            alt={`Frame at ${formatTimestamp(frame.timestamp)}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                            <span className="text-xs text-white font-mono">
                              {formatTimestamp(frame.timestamp)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download PDF Button */}
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF Report
                    </>
                  )}
                </button>
              </div>

              {/* Right Column - Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hook Analysis (Video Only) */}
                {result.hookAnalysis && (
                  <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 overflow-hidden">
                    <button
                      onClick={() => toggleSection('hookAnalysis')}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-purple-500/5 transition-colors"
                    >
                      <h2 className="font-semibold flex items-center gap-2 text-purple-400">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
                        Hook Analysis (First 3 Seconds)
                      </h2>
                      <svg
                        className={`w-5 h-5 text-purple-400 transition-transform duration-200 ${expandedSections.hookAnalysis ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out ${expandedSections.hookAnalysis ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      <div className="px-6 pb-6 space-y-4">
                        {/* First Frame */}
                        <div className="p-4 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-300">First Frame</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-mono font-bold ${getCategoryScoreColor(result.hookAnalysis.firstFrameScore)}`}>
                              {result.hookAnalysis.firstFrameScore}/10
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500">{result.hookAnalysis.firstFrameAnalysis}</p>
                        </div>
                        {/* 3-Second Hook */}
                        <div className="p-4 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-300">3-Second Hook</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-mono font-bold ${getCategoryScoreColor(result.hookAnalysis.threeSecondScore)}`}>
                              {result.hookAnalysis.threeSecondScore}/10
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500">{result.hookAnalysis.threeSecondAnalysis}</p>
                        </div>
                        {/* Recommendation */}
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <span className="text-sm font-medium text-purple-300">Hook Recommendation:</span>
                          <p className="text-sm text-purple-200/80 mt-1">{result.hookAnalysis.hookRecommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Breakdown */}
                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => toggleSection('scoreBreakdown')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
                  >
                    <h2 className="font-semibold flex items-center gap-2 text-zinc-100">
                      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                      Score Breakdown
                    </h2>
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${expandedSections.scoreBreakdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${expandedSections.scoreBreakdown ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="px-6 pb-6 space-y-3">
                      {result.categories.map((category, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800"
                        >
                          <div
                            className={`px-2.5 py-1 rounded-md text-sm font-mono font-bold ${getCategoryScoreColor(category.score)}`}
                          >
                            {category.score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-zinc-100">{category.name}</p>
                            <p className="text-zinc-500 text-sm">
                              {category.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ad Copy Analysis */}
                {result.copyAnalysis && (
                  <div className="rounded-xl bg-teal-500/5 border border-teal-500/20 overflow-hidden">
                    <button
                      onClick={() => toggleSection('copyAnalysis')}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-teal-500/5 transition-colors"
                    >
                      <h2 className="font-semibold flex items-center gap-2 text-teal-400">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500" />
                        Ad Copy Analysis
                      </h2>
                      <svg
                        className={`w-5 h-5 text-teal-400 transition-transform duration-200 ${expandedSections.copyAnalysis ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out ${expandedSections.copyAnalysis ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      <div className="px-6 pb-6 space-y-4">
                        {/* Provided Copy */}
                        {result.copyAnalysis.primaryTextProvided && (
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-teal-400 uppercase tracking-wide">Primary Text</span>
                            <p className="text-sm text-zinc-300 mt-1">{result.copyAnalysis.primaryTextProvided}</p>
                            {result.copyAnalysis.primaryTextProvided.length > 125 && (
                              <p className="text-xs text-yellow-500 mt-1">
                                {result.copyAnalysis.primaryTextProvided.length} chars — may truncate on mobile
                              </p>
                            )}
                          </div>
                        )}
                        {result.copyAnalysis.headlineProvided && (
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-teal-400 uppercase tracking-wide">Headline</span>
                            <p className="text-sm text-zinc-300 mt-1">{result.copyAnalysis.headlineProvided}</p>
                          </div>
                        )}

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800 text-center">
                            <span className={`text-2xl font-bold ${getCategoryScoreColor(result.copyAnalysis.primaryTextScore)}`}>
                              {result.copyAnalysis.primaryTextScore}
                            </span>
                            <p className="text-xs text-zinc-500 mt-1">Primary Text</p>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800 text-center">
                            <span className={`text-2xl font-bold ${getCategoryScoreColor(result.copyAnalysis.headlineScore)}`}>
                              {result.copyAnalysis.headlineScore}
                            </span>
                            <p className="text-xs text-zinc-500 mt-1">Headline</p>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800 text-center">
                            <span className={`text-2xl font-bold ${getCategoryScoreColor(result.copyAnalysis.copyCreativeAlignment)}`}>
                              {result.copyAnalysis.copyCreativeAlignment}
                            </span>
                            <p className="text-xs text-zinc-500 mt-1">Copy-Creative Fit</p>
                          </div>
                        </div>

                        {/* Analysis */}
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-teal-400 uppercase tracking-wide">Primary Text Analysis</span>
                            <p className="text-sm text-zinc-400 mt-1">{result.copyAnalysis.primaryTextAnalysis}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-teal-400 uppercase tracking-wide">Headline Analysis</span>
                            <p className="text-sm text-zinc-400 mt-1">{result.copyAnalysis.headlineAnalysis}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-teal-400 uppercase tracking-wide">Copy-Creative Alignment</span>
                            <p className="text-sm text-zinc-400 mt-1">{result.copyAnalysis.copyCreativeAlignmentReason}</p>
                          </div>
                        </div>

                        {/* Copy Fixes */}
                        {result.copyAnalysis.copyFixes && result.copyAnalysis.copyFixes.length > 0 && (
                          <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
                            <span className="text-sm font-medium text-teal-300">Copy Fixes:</span>
                            <ul className="mt-2 space-y-2">
                              {result.copyAnalysis.copyFixes.map((fix, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-teal-200/80">
                                  <span className="text-teal-400 mt-0.5">•</span>
                                  {fix}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Analysis (Video Only) */}
                {result.audioAnalysis && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 overflow-hidden">
                    <button
                      onClick={() => toggleSection('audioAnalysis')}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-amber-500/5 transition-colors"
                    >
                      <h2 className="font-semibold flex items-center gap-2 text-amber-400">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
                        Audio Analysis
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-mono font-bold ${getCategoryScoreColor(result.audioAnalysis.audioHookScore)}`}>
                          {result.audioAnalysis.audioHookScore}/10
                        </span>
                      </h2>
                      <svg
                        className={`w-5 h-5 text-amber-400 transition-transform duration-200 ${expandedSections.audioAnalysis ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out ${expandedSections.audioAnalysis ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      <div className="px-6 pb-6 space-y-3">
                        {/* Audio Format Status */}
                        <div className="flex items-center gap-2">
                          {result.audioAnalysis.isMusicOnly ? (
                            <>
                              <span className="text-lg">🎵</span>
                              <span className="text-sm text-zinc-300">Music-only format detected</span>
                            </>
                          ) : result.audioAnalysis.hasVoiceover ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-sm text-zinc-300">Voiceover detected</span>
                              <span className={`ml-auto text-xs px-2 py-0.5 rounded ${result.audioAnalysis.voiceoverStartsEarly ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                {result.audioAnalysis.voiceoverStartsEarly ? "Hooks in first 2s" : "Slow start"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-sm text-zinc-300">No audio track detected</span>
                            </>
                          )}
                        </div>

                        {/* Opening Line (only for voiceover) */}
                        {result.audioAnalysis.hasVoiceover && result.audioAnalysis.openingLine && (
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">Opening Line (First 5s)</span>
                            <p className="text-sm text-zinc-200 mt-1 italic">&ldquo;{result.audioAnalysis.openingLine}&rdquo;</p>
                          </div>
                        )}

                        {/* Transcript (only for voiceover) */}
                        {result.audioAnalysis.hasVoiceover && result.audioAnalysis.transcript && (
                          <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                            <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">Transcript (First 10s)</span>
                            <p className="text-sm text-zinc-400 mt-1">{result.audioAnalysis.transcript}</p>
                          </div>
                        )}

                        {/* Audio Hook Assessment */}
                        <div className={`p-3 rounded-lg ${result.audioAnalysis.audioHookScore >= 7 ? "bg-green-500/10 border border-green-500/20" : result.audioAnalysis.audioHookScore >= 5 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                          <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                            {result.audioAnalysis.isMusicOnly ? "Format Assessment" : "Audio Hook Assessment"}
                          </span>
                          <p className={`text-sm mt-1 ${result.audioAnalysis.audioHookScore >= 7 ? "text-green-300/80" : result.audioAnalysis.audioHookScore >= 5 ? "text-yellow-300/80" : "text-red-300/80"}`}>
                            {result.audioAnalysis.audioHookAssessment}
                          </p>
                        </div>

                        {/* Text Overlay Verdict for Music-Only */}
                        {result.audioAnalysis.isMusicOnly && result.videoNotes?.textOverlayVerdict && (
                          <div className={`p-3 rounded-lg ${
                            result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                              ? "bg-green-500/10 border border-green-500/20"
                              : "bg-yellow-500/10 border border-yellow-500/20"
                          }`}>
                            <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">Text Overlay Assessment</span>
                            <p className={`text-sm mt-1 ${
                              result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                                ? "text-green-300/80"
                                : "text-yellow-300/80"
                            }`}>
                              {result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                                ? "✅ " : "⚠️ "}{result.videoNotes.textOverlayVerdict}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Notes (Video Only) */}
                {result.videoNotes && (
                  <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => toggleSection('videoNotes')}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
                    >
                      <h2 className="font-semibold flex items-center gap-2 text-zinc-100">
                        <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
                        Video Analysis Notes
                      </h2>
                      <svg
                        className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${expandedSections.videoNotes ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out ${expandedSections.videoNotes ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      <div className="px-6 pb-6 space-y-3">
                        <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                          <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">Pacing</span>
                          <p className="text-sm text-zinc-400 mt-1">{result.videoNotes.pacing}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                          <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">Text Timing</span>
                          <p className="text-sm text-zinc-400 mt-1">{result.videoNotes.textTiming}</p>
                        </div>
                        {result.videoNotes.textOverlayVerdict && (
                          <div className={`p-3 rounded-lg ${
                            result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                              ? "bg-green-500/10 border border-green-500/20"
                              : result.videoNotes.textOverlayVerdict.toLowerCase().includes("no text") || result.videoNotes.textOverlayVerdict.toLowerCase().includes("too small")
                                ? "bg-yellow-500/10 border border-yellow-500/20"
                                : "bg-[#0a0a0b] border border-zinc-800"
                          }`}>
                            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">Text Overlay Verdict</span>
                            <p className={`text-sm mt-1 ${
                              result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                                ? "text-green-300/80"
                                : result.videoNotes.textOverlayVerdict.toLowerCase().includes("no text") || result.videoNotes.textOverlayVerdict.toLowerCase().includes("too small")
                                  ? "text-yellow-300/80"
                                  : "text-zinc-400"
                            }`}>
                              {result.videoNotes.textOverlayVerdict.toLowerCase().includes("clear") && !result.videoNotes.textOverlayVerdict.toLowerCase().includes("not clear")
                                ? "✅ " : result.videoNotes.textOverlayVerdict.toLowerCase().includes("no text") || result.videoNotes.textOverlayVerdict.toLowerCase().includes("too small")
                                  ? "⚠️ " : ""}{result.videoNotes.textOverlayVerdict}
                            </p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                          <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">CTA Timing</span>
                          <p className="text-sm text-zinc-400 mt-1">{result.videoNotes.ctaTiming}</p>
                        </div>
                        {result.videoNotes.endCardAnalysis && (
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">End Card Analysis</span>
                            <p className="text-sm text-purple-300/80 mt-1">{result.videoNotes.endCardAnalysis}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 3 Fixes */}
                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => toggleSection('topFixes')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
                  >
                    <h2 className="font-semibold flex items-center gap-2 text-zinc-100">
                      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-orange-500 to-red-500" />
                      Top 3 Fixes
                    </h2>
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${expandedSections.topFixes ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${expandedSections.topFixes ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="px-6 pb-6 space-y-3">
                      {result.topFixes.map((fix, i) => (
                        <div
                          key={i}
                          className="flex gap-3 p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm text-zinc-300">{fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Policy Flags */}
                {result.policyFlags.length > 0 && (
                  <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
                    <h2 className="font-semibold mb-4 flex items-center gap-2 text-red-400">
                      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-red-500 to-rose-500" />
                      Policy Flags
                    </h2>
                    <div className="space-y-2">
                      {result.policyFlags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-400">•</span>
                          <span className="text-red-300">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What's Working */}
                <div className="rounded-xl bg-green-500/5 border border-green-500/20 overflow-hidden">
                  <button
                    onClick={() => toggleSection('whatsWorking')}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-green-500/5 transition-colors"
                  >
                    <h2 className="font-semibold flex items-center gap-2 text-green-400">
                      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-green-500 to-emerald-500" />
                      What&apos;s Working
                    </h2>
                    <svg
                      className={`w-5 h-5 text-green-400 transition-transform duration-200 ${expandedSections.whatsWorking ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${expandedSections.whatsWorking ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="px-6 pb-6">
                      <p className="text-sm text-green-300/80">{result.whatsWorking}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Zoom Modal */}
      {zoomedFrame && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setZoomedFrame(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setZoomedFrame(null)}
              className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center z-10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={`data:image/jpeg;base64,${zoomedFrame.base64}`}
              alt={`Frame at ${formatTimestamp(zoomedFrame.timestamp)}`}
              className="max-w-full max-h-[85vh] rounded-lg border border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full">
              <span className="text-white font-mono text-sm">
                {formatTimestamp(zoomedFrame.timestamp)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-zinc-800 mt-20 py-20 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              Stop wasting ad spend on untested creative. Get instant AI feedback before you launch.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Individual Plan */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Individual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-100">$49</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Unlimited ad scoring</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Video + image analysis</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copy analysis</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Platform previews (Facebook, Instagram, TikTok)</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>PDF export</span>
                </li>
              </ul>

              <a
                href="https://buy.stripe.com/dRm14naE29pbcLbfJg6Zy00"
                className="block w-full py-3 px-6 text-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Agency Plan */}
            <div className="rounded-2xl border-2 border-indigo-500/50 bg-zinc-900/50 p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">Agency</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-100">$149</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Everything in Individual</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Team-friendly PDF reports</span>
                </li>
              </ul>

              <a
                href="https://buy.stripe.com/dRmdR96nM6cZ12t0Om6Zy01"
                className="block w-full py-3 px-6 text-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-all"
              >
                Get Started
              </a>
            </div>
          </div>

          <p className="text-center text-zinc-600 text-sm mt-8">
            Cancel anytime. No contracts, no hassle.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-zinc-600 text-sm">
            Built for media buyers who hate wasting money on bad creative.
          </div>
          <div className="flex justify-center gap-6 mt-4 text-zinc-500 text-sm">
            <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
            <a href="mailto:support@getadscore.com" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
          <div className="text-center text-zinc-700 text-xs mt-4">
            GetAdScore is not affiliated with or endorsed by Meta, Instagram, or TikTok.
          </div>
          <div className="text-center text-zinc-700 text-xs mt-2">
            © {new Date().getFullYear()} DMCSITE LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
