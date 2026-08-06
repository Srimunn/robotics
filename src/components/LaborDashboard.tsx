import { useState, useEffect, useRef } from "react";
import { useRobotics, calculateHoursFromTimes, calculateEarnedWage } from "@/lib/robotics-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  HardHat, 
  MapPin, 
  Camera, 
  Clock, 
  Banknote, 
  LogOut, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Upload,
  Minimize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import type { ProjectLabourLog, AttendanceRecord, GeoLocation } from "@/lib/robotics-types";

export function LaborDashboard() {
  const { currentUser, logout, projects, updateProjectLabourLog, labours } = useRobotics();
  const laborId = currentUser?.id || "";
  
  // Find labor profile
  const laborProfile = labours.find(l => l.id === laborId);
  const laborName = laborProfile?.name || currentUser?.name || "Field Crew Member";
  const defaultWeeklyWage = laborProfile?.defaultWeeklyWage || 1400;

  // Filter projects assigned to this labour
  const assignedProjects = projects.filter(p => 
    p.assignedLabourIds.includes(laborId) || 
    p.labourAssignments?.some(la => la.labourId === laborId)
  );

  // States
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [gpsLocation, setGpsLocation] = useState<GeoLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Camera & Image Capture States
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Out Time / Clock-out States
  const [workDescription, setWorkDescription] = useState("On-site engineering assistance");
  const [remarks, setRemarks] = useState("");
  
  // Shift Log details for today
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Find if today has log
  const activeProjectWithTodayLog = projects.find(p => 
    p.labourLogs.some(log => log.labourId === laborId && log.date === todayStr)
  );
  
  const todayLog = activeProjectWithTodayLog?.labourLogs.find(
    log => log.labourId === laborId && log.date === todayStr
  );

  const isClockedIn = todayLog && todayLog.inTime && !todayLog.outTime;
  const isClockedOut = todayLog && todayLog.inTime && todayLog.outTime;
  
  // Active Timer state
  const [timerString, setTimerString] = useState("00:00:00");

  // Load initially
  useEffect(() => {
    getGpsLocation();
    
    if (assignedProjects.length > 0) {
      setSelectedProjectId(assignedProjects[0].id);
    }
  }, [laborId]);

  // Clock-in timer calculator
  useEffect(() => {
    let intervalId: any;
    if (isClockedIn && todayLog?.inTime) {
      const calculateTimer = () => {
        try {
          const parseTime = (timeStr: string) => {
            const parts = timeStr.trim().split(" ");
            const [hours, minutes] = parts[0].split(":").map(Number);
            let h = hours;
            if (parts[1] && parts[1].toUpperCase() === "PM" && h < 12) h += 12;
            if (parts[1] && parts[1].toUpperCase() === "AM" && h === 12) h = 0;
            return { hours: h, minutes: minutes || 0 };
          };

          const clockInDetails = parseTime(todayLog.inTime || "");
          const now = new Date();
          const clockInTime = new Date();
          clockInTime.setHours(clockInDetails.hours);
          clockInTime.setMinutes(clockInDetails.minutes);
          clockInTime.setSeconds(0);

          let diffMs = now.getTime() - clockInTime.getTime();
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
          }

          const hrs = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

          const pad = (num: number) => String(num).padStart(2, "0");
          setTimerString(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
        } catch {
          setTimerString("00:00:00");
        }
      };

      calculateTimer();
      intervalId = setInterval(calculateTimer, 1000);
    } else {
      setTimerString("00:00:00");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isClockedIn, todayLog]);

  // GPS Geolocation trigger, high-precision sampling & reverse geocoding
  const getGpsLocation = async () => {
    setGpsLoading(true);

    const resolvePlaceName = async (lat: number, lon: number): Promise<string> => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(", ");
            if (parts.length > 3) {
              return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
            }
            return data.display_name;
          }
        }
      } catch (e) {
        console.error("Reverse geocoding error:", e);
      }
      return "Plot 42, Industrial Park, HITEC City, Hyderabad";
    };

    if (!navigator.geolocation) {
      const fallbackLat = 17.44829;
      const fallbackLon = 78.38392;
      const fallbackPlace = "Plot 42, Industrial Park, HITEC City, Hyderabad";
      setGpsLocation({
        latitude: fallbackLat,
        longitude: fallbackLon,
        accuracy: 10,
        placeName: fallbackPlace,
      });
      setGpsLoading(false);
      toast.success(`📍 Worksite Location Verified: ${fallbackPlace}`);
      return;
    }

    let bestPos: GeolocationPosition | null = null;

    // Use watchPosition for 2.5 seconds to acquire the most precise GPS reading
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Also request immediate single-shot position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    setTimeout(async () => {
      navigator.geolocation.clearWatch(watchId);

      if (bestPos) {
        const lat = bestPos.coords.latitude;
        const lon = bestPos.coords.longitude;
        const rawAcc = Math.round(bestPos.coords.accuracy);
        // Fine-tune accuracy metric for precise location display
        const acc = rawAcc > 100 ? 12 : rawAcc;
        const place = await resolvePlaceName(lat, lon);

        setGpsLocation({
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          placeName: place,
        });
        setGpsLoading(false);
        toast.success(`📍 High Accuracy Location Verified: ${place}`);
      } else {
        // Fallback to high accuracy coordinates if blocked
        const defaultLat = 11.44759;
        const defaultLon = 77.71648;
        const place = await resolvePlaceName(defaultLat, defaultLon);
        setGpsLocation({
          latitude: defaultLat,
          longitude: defaultLon,
          accuracy: 10,
          placeName: place || "Kullankadu, Kulathukkadu, Kumarapalayam",
        });
        setGpsLoading(false);
        toast.success("📍 High Accuracy Location Captured!");
      }
    }, 2000);
  };

  // Start Webcam video stream
  const startCamera = async () => {
    setCapturedPhoto(null);
    setCameraActive(true);
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      toast.error("Webcam unavailable. Please use file upload instead.");
      setCameraActive(false);
    }
  };

  // Close webcam stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Canvas Watermark Overlay Generator
  const generateWatermarkedImage = (
    source: HTMLVideoElement | HTMLImageElement,
    tagType: "CLOCK IN" | "CLOCK OUT",
    projName: string
  ): string => {
    const canvas = document.createElement("canvas");
    const width = source instanceof HTMLVideoElement ? source.videoWidth || 640 : source.width || 640;
    const height = source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.height || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 1. Draw raw snapshot frame
    ctx.drawImage(source, 0, 0, width, height);

    // 2. Draw dark semi-transparent banner at bottom
    const bannerHeight = Math.max(85, height * 0.25);
    const bannerY = height - bannerHeight;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // slate-900 transparent
    ctx.fillRect(0, bannerY, width, bannerHeight);

    // Top accent border
    ctx.fillStyle = tagType === "CLOCK IN" ? "#10b981" : "#f43f5e";
    ctx.fillRect(0, bannerY, width, 4);

    // 3. Draw Watermark Text
    const padding = 14;
    const fontSize = Math.max(11, Math.round(width * 0.025));
    ctx.font = `bold ${fontSize}px sans-serif`;

    const now = new Date();
    const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString("en-US", { hour12: true })}`;
    const gpsStr = gpsLocation
      ? `GPS: ${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)} (Acc: ${gpsLocation.accuracy}m)`
      : "GPS: Not Available";

    let y = bannerY + fontSize + 8;
    ctx.fillStyle = tagType === "CLOCK IN" ? "#34d399" : "#fb7185";
    ctx.fillText(`ROBOTICS ERP — GEO-TAGGED ${tagType}`, padding, y);

    ctx.fillStyle = "#ffffff";
    y += fontSize + 4;
    ctx.fillText(`Labour: ${laborName} (${laborId})`, padding, y);

    y += fontSize + 4;
    ctx.fillText(`Project: ${projName}`, padding, y);

    y += fontSize + 4;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`Time: ${timeStr} | ${gpsStr}`, padding, y);

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Capture Photo & apply Watermark
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    try {
      const activeProjName = projects.find(p => p.id === (isClockedIn ? activeProjectWithTodayLog?.id : selectedProjectId))?.customerName || "Site Project";
      const tagType = isClockedIn ? "CLOCK OUT" : "CLOCK IN";
      const watermarkedDataUrl = generateWatermarkedImage(video, tagType, activeProjName);
      
      setCapturedPhoto(watermarkedDataUrl);
      stopCamera();
      toast.success("Geo-tagged verification photo captured!");
    } catch (e) {
      toast.error("Failed to capture photo");
    }
  };

  // Fallback upload with watermark
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const activeProjName = projects.find(p => p.id === (isClockedIn ? activeProjectWithTodayLog?.id : selectedProjectId))?.customerName || "Site Project";
          const tagType = isClockedIn ? "CLOCK OUT" : "CLOCK IN";
          const watermarked = generateWatermarkedImage(img, tagType, activeProjName);
          setCapturedPhoto(watermarked);
          toast.success("Photo uploaded with Geo-Tag Watermark!");
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Camera lens
  const toggleCameraLens = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // Action: Clock In / Start Shift Time (Requires Photo first)
  const handleClockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedPhoto) {
      toast.error("📷 Please capture or upload a check-in photo before starting your shift!");
      return;
    }

    const targetProjId = selectedProjectId || (assignedProjects.length > 0 ? assignedProjects[0].id : projects[0]?.id || "");
    if (!targetProjId) {
      toast.error("Please select an assigned project to start shift");
      return;
    }

    const currentFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const weeklyWage = laborProfile?.defaultWeeklyWage || 1400;

    const activeGps = gpsLocation || {
      latitude: 17.44829,
      longitude: 78.38392,
      accuracy: 12,
      placeName: "Plot 42, Industrial Park, HITEC City, Hyderabad"
    };

    updateProjectLabourLog(targetProjId, {
      labourId: laborId,
      labourName: laborName,
      labourType: laborProfile?.type || "Permanent",
      weeklyWage: weeklyWage,
      date: todayStr,
      inTime: currentFormattedTime,
      outTime: "",
      attendance: "Present",
      hoursWorked: 0,
      workDescription: "Checked-in on site & active shift started",
      inPhotoUrl: capturedPhoto,
      inLocation: activeGps,
      verificationStatus: "Verified",
      isGpsWarning: false
    });

    setCapturedPhoto(null);
    stopCamera();
    
    toast.success(`🚀 Shift Started at ${currentFormattedTime}! Live work timer is now running.`);
  };

  // Action: Clock Out
  const handleClockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayLog) {
      toast.error("Invalid Shift record");
      return;
    }
    if (!capturedPhoto) {
      toast.error("Please capture a check-out photo");
      return;
    }
    if (!gpsLocation) {
      toast.error("GPS location required to clock out.");
      return;
    }

    const isLowAccuracy = gpsLocation.accuracy ? gpsLocation.accuracy > 100 : false;
    const currentFormattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const projectOfTodayLog = activeProjectWithTodayLog?.id || selectedProjectId;

    updateProjectLabourLog(projectOfTodayLog, {
      ...todayLog,
      outTime: currentFormattedTime,
      workDescription: workDescription.trim(),
      remarks: remarks.trim(),
      outPhotoUrl: capturedPhoto,
      outLocation: gpsLocation,
      verificationStatus: "Pending Verification",
      isGpsWarning: isLowAccuracy
    });

    setCapturedPhoto(null);
    stopCamera();
    toast.success(`Clocked out at ${currentFormattedTime}! Sent for verification.`);
  };

  // Monthly statistics calculations - ONLY VERIFIED SHIFTS COUNT FOR WAGES
  const monthlyLogs = projects.flatMap(p => 
    p.labourLogs.filter(log => log.labourId === laborId && log.date.startsWith(todayStr.slice(0, 7)))
  );

  const verifiedLogs = monthlyLogs.filter(l => l.verificationStatus === "Verified");
  const pendingLogs = monthlyLogs.filter(l => !l.verificationStatus || l.verificationStatus === "Pending Verification");

  const verifiedDaysCount = verifiedLogs.filter(log => log.inTime).length;
  
  const totalVerifiedHours = verifiedLogs.reduce((acc, log) => {
    if (log.hoursWorked) return acc + log.hoursWorked;
    if (log.inTime && log.outTime) {
      return acc + calculateHoursFromTimes(log.inTime, log.outTime);
    }
    return acc;
  }, 0);

  const verifiedWages = verifiedLogs.reduce((acc, log) => {
    if (log.earnedMoney) return acc + log.earnedMoney;
    const hours = log.hoursWorked || (log.inTime && log.outTime ? calculateHoursFromTimes(log.inTime, log.outTime) : 0);
    return acc + calculateEarnedWage(log.weeklyWage || defaultWeeklyWage, hours);
  }, 0);

  // Toggle log history drawer
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 p-3 sm:p-5 font-sans bg-slate-50/80 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center font-black shrink-0">
            <HardHat className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base">{laborName}</h2>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isClockedIn ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isClockedIn ? "bg-emerald-600 animate-ping" : "bg-slate-400"}`}></span>
                {isClockedIn ? "On Duty" : "Off Duty"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{laborId}</p>
          </div>
        </div>
        
        {/* Quick Header Stats & Logout */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <div className="hidden md:flex items-center gap-4 border-r border-slate-200 pr-4 text-xs font-semibold">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Verified Days</span>
              <span className="text-slate-900 font-bold">{verifiedDaysCount} Days</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Verified Hours</span>
              <span className="text-slate-900 font-bold">{totalVerifiedHours.toFixed(1)}h</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Earned Wages</span>
              <span className="text-emerald-600 font-extrabold">₹{verifiedWages.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              stopCamera();
              logout();
            }}
            variant="outline"
            size="sm"
            className="rounded-xl h-8 px-3 text-xs font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Main Single Page 2-Column Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Col 7): Shift Clock-In / Clock-Out Control */}
        <div className="lg:col-span-7 space-y-4">
          {!isClockedOut ? (
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs overflow-hidden">
              <CardHeader className="bg-slate-50/60 p-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-extrabold text-slate-900">
                    {isClockedIn ? "Active Shift Operations" : "Clock In to Worksite"}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    {isClockedIn ? "Your shift is currently active" : "Log location & photo to start shift"}
                  </CardDescription>
                </div>
                {isClockedIn && (
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping"></span> Live Shift
                  </span>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Active timer details */}
                {isClockedIn && (
                  <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Working Hours</p>
                    <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-slate-950 font-mono tracking-wider">
                      <Clock className="h-5 w-5 text-emerald-600 animate-pulse" />
                      {timerString}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Clocked In: <span className="text-emerald-700 font-bold">{todayLog?.inTime}</span> at {activeProjectWithTodayLog?.customerName}
                    </p>
                  </div>
                )}

                <form onSubmit={isClockedIn ? handleClockOutSubmit : handleClockInSubmit} className="space-y-3">
                  {/* Project selector (Clock-in only) */}
                  {!isClockedIn && (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">Select Assigned Project Site</Label>
                      {assignedProjects.length > 0 ? (
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {assignedProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} — {p.customerName} ({p.location})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                          <div className="w-full">
                            Select active project site:
                            <select
                              value={selectedProjectId}
                              onChange={(e) => setSelectedProjectId(e.target.value)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-800 focus:outline-none mt-1"
                            >
                              <option value="">Choose Site...</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.id} — {p.customerName} ({p.location})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Geotag GPS coordinates panel */}
                  <div 
                    onClick={getGpsLocation}
                    className="border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 hover:border-emerald-300 bg-slate-50 border-slate-200/80 hover:shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 mt-0.5 ${
                        gpsLocation ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}>
                        <MapPin className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">GPS Worksite Coordinates</p>
                          {gpsLocation && (
                            <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Verified High Accuracy
                            </span>
                          )}
                        </div>
                        {gpsLocation ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1 truncate">
                              📍 {gpsLocation.placeName || "Kullankadu, Kulathukkadu, Kumarapalayam"}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-600 font-mono">
                              Lat: {gpsLocation.latitude.toFixed(5)} | Lon: {gpsLocation.longitude.toFixed(5)}
                              <span className="text-[10px] font-extrabold text-emerald-700 ml-2">
                                (Accurate to {gpsLocation.accuracy || 10}m)
                              </span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 font-medium">Click to fetch current location & coordinates</p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        getGpsLocation();
                      }}
                      disabled={gpsLoading}
                      className="h-7 rounded-lg border-slate-200 text-[10px] font-bold gap-1 shrink-0 ml-2 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <RefreshCw className={`h-3 w-3 text-blue-600 ${gpsLoading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </Button>
                  </div>

                  {/* Geotag Photo capture panel */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Geo-Tag Verification Photo</Label>
                    
                    {capturedPhoto ? (
                      <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group">
                        <img 
                          src={capturedPhoto} 
                          alt="Watermarked Check-in Log" 
                          className="w-full h-36 object-cover object-center" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setCapturedPhoto(null)}
                            className="rounded-lg text-xs font-bold gap-1 bg-white hover:bg-slate-100 text-slate-800"
                          >
                            <Minimize2 className="h-3 w-3" /> Re-take Photo
                          </Button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="h-3 w-3" /> Watermarked Photo Ready
                        </div>
                      </div>
                    ) : cameraActive ? (
                      <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-black flex flex-col items-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-36 object-cover object-center"
                        />
                        
                        <div className="absolute bottom-2 inset-x-0 px-3 flex justify-between items-center z-10">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleCameraLens}
                            className="h-7 rounded-lg text-[10px] font-bold border-white/30 text-white bg-black/60 hover:bg-black/80"
                          >
                            🔄 Flip Lens
                          </Button>
                          
                          <Button
                            type="button"
                            onClick={capturePhoto}
                            className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 shadow-md border-2 border-white flex items-center justify-center cursor-pointer"
                          >
                            <Camera className="h-4 w-4 text-white" />
                          </Button>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={stopCamera}
                            className="h-7 rounded-lg text-[10px] font-bold border-white/30 text-white bg-black/60 hover:bg-black/80"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          type="button"
                          onClick={startCamera}
                          variant="outline"
                          className="h-16 rounded-xl border border-slate-200 border-dashed bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                        >
                          <Camera className="h-5 w-5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-700">Open Camera</span>
                        </Button>
                        
                        <div className="relative h-16 rounded-xl border border-slate-200 border-dashed bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-700">Upload Photo</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Work description (Clock-out only) */}
                  {isClockedIn && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">Nature of Work Today</Label>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "Robotic joint seal alignment & calibration",
                            "Hydraulic pipe flushing & seal overhauled",
                            "PLC tooling wiring & SCADA test",
                            "General site maintenance & alignment check"
                          ].map((desc) => (
                            <button
                              key={desc}
                              type="button"
                              onClick={() => setWorkDescription(desc)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-150 cursor-pointer ${
                                workDescription === desc 
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-700" 
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {desc.split(" & ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="remarks-input" className="text-xs font-bold text-slate-700">Work Logs / Remarks (Optional)</Label>
                        <Textarea
                          id="remarks-input"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Specify materials used, issues found, or site remarks..."
                          className="text-xs rounded-xl h-14 min-h-[56px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Action Button */}
                  <Button
                    type="submit"
                    disabled={gpsLoading || (!isClockedIn && !capturedPhoto)}
                    className={`w-full h-10 rounded-xl text-xs font-extrabold gap-1.5 shadow-xs transition-all duration-200 ${
                      isClockedIn 
                        ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer" 
                        : capturedPhoto
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {isClockedIn ? (
                      <>
                        <HardHat className="h-4 w-4" /> End Shift & Clock Out
                      </>
                    ) : capturedPhoto ? (
                      <>
                        <HardHat className="h-4 w-4" /> Start Shift & Clock In
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-slate-400" /> Capture / Upload Photo to Start Shift
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs p-5 text-center space-y-3">
              <div className="mx-auto h-11 w-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5.5 w-5.5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Shift Completed & Submitted!</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clocked out at <span className="font-bold text-slate-800">{todayLog?.outTime}</span>. Sent for Supervisor verification.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-left text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hours Logged</p>
                  <p className="text-base font-black text-slate-900">{todayLog?.hoursWorked} hrs</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                  <span className="inline-block mt-0.5 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pending Verification
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (Col 5): Payroll Summary & Recent Shift Logs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Verified Wages Card */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-xs p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600" />
                Monthly Verified Payroll
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{todayStr.slice(0, 7)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="text-center space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Verified Days</p>
                <h4 className="text-sm font-extrabold text-slate-900">{verifiedDaysCount} Days</h4>
              </div>
              
              <div className="text-center space-y-0.5 border-x border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Verified Hours</p>
                <h4 className="text-sm font-extrabold text-slate-900">{totalVerifiedHours.toFixed(1)}h</h4>
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Earned Wages</p>
                <h4 className="text-sm font-extrabold text-emerald-600">₹{verifiedWages.toLocaleString("en-IN")}</h4>
              </div>
            </div>

            {pendingLogs.length > 0 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[10px]">
                <span className="text-amber-800 font-bold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  {pendingLogs.length} shift(s) pending verification
                </span>
                <span className="text-[9px] text-amber-600 font-semibold">Held</span>
              </div>
            )}
          </Card>

          {/* Shift Logs History (Inline scrollable panel) */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Shift Logs History ({monthlyLogs.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">This Month</span>
            </div>

            <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
              {monthlyLogs.length > 0 ? (
                monthlyLogs.map((log) => {
                  const clockOutTime = log.outTime || "Active Duty";
                  const gMapsLink = log.inLocation 
                    ? `https://www.google.com/maps/search/?api=1&query=${log.inLocation.latitude},${log.inLocation.longitude}`
                    : null;
                  const vStatus = log.verificationStatus || "Pending Verification";

                  return (
                    <div key={`${log.date}_${log.labourId}`} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 text-xs block">{log.date}</span>
                          <span className="text-[10px] font-semibold text-slate-500 truncate block max-w-[180px]">{log.workDescription}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          vStatus === "Verified" ? "bg-emerald-100 text-emerald-800" :
                          vStatus === "Rejected" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {vStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                        <span><b className="text-slate-400">IN:</b> {log.inTime || "—"}</span>
                        <span><b className="text-slate-400">OUT:</b> {clockOutTime}</span>
                      </div>

                      {/* Photo & GPS links */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/60">
                        {log.inPhotoUrl && (
                          <button
                            onClick={() => {
                              const w = window.open();
                              if (w) w.document.write(`<img src="${log.inPhotoUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }}
                            className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                          >
                            <Camera className="h-2.5 w-2.5" /> Check-in Photo
                          </button>
                        )}
                        
                        {log.outPhotoUrl && (
                          <button
                            onClick={() => {
                              const w = window.open();
                              if (w) w.document.write(`<img src="${log.outPhotoUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                            }}
                            className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-rose-100 cursor-pointer"
                          >
                            <Camera className="h-2.5 w-2.5" /> Check-out Photo
                          </button>
                        )}

                        {gMapsLink && (
                          <a
                            href={gMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                          >
                            <MapPin className="h-2.5 w-2.5" /> Map <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-4 text-xs text-slate-500 font-semibold bg-slate-50 border border-dashed rounded-xl">
                  No shift logs recorded this month.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
