import React, { useState, useMemo, useRef, useEffect } from "react";
import "./activityHeatmap.css";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ActivityHeatmap({
  data = null,
  title = "submissions in the past one year",
  hideHeaderStats = false
}) {
  const [selectedYear, setSelectedYear] = useState("current");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submissionCalendar = data?.submissionCalendar || {};
  const activityDetails = data?.activityDetails || {};

  // Compute Grid Matrix & Month Headers
  const { weeks, monthLabels, totalSubmissions, totalActiveDays, maxStreak, currentStreak } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate, endDate;

    if (selectedYear === "current") {
      endDate = new Date(today);
      // Align end of grid to the end of the current week (Saturday)
      const dayOfWeek = endDate.getDay(); // 0 is Sunday, 6 is Saturday
      const daysToSaturday = 6 - dayOfWeek;
      const gridEnd = new Date(endDate);
      gridEnd.setDate(endDate.getDate() + daysToSaturday);

      // 53 columns * 7 days = 371 days back
      startDate = new Date(gridEnd);
      startDate.setDate(gridEnd.getDate() - (53 * 7 - 1));
    } else {
      const year = parseInt(selectedYear, 10);
      startDate = new Date(year, 0, 1);
      // Align startDate to Sunday
      const startDayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - startDayOfWeek);

      const targetEnd = new Date(year, 11, 31);
      const endDayOfWeek = targetEnd.getDay();
      const gridEnd = new Date(targetEnd);
      gridEnd.setDate(targetEnd.getDate() + (6 - endDayOfWeek));
      endDate = targetEnd > today ? today : targetEnd;
    }

    const weeksArr = [];
    const monthsArr = [];
    let currentWeek = [];
    let currDate = new Date(startDate);
    let lastMonth = -1;
    let colIndex = 0;

    let periodSubmissions = 0;
    let periodActiveDays = 0;

    // Helper to format YYYY-MM-DD in local time
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    while (currDate <= (selectedYear === "current" ? today : new Date(parseInt(selectedYear, 10), 11, 31)) || currentWeek.length > 0) {
      const dateStr = formatDate(currDate);
      const count = submissionCalendar[dateStr] || 0;
      const isFuture = currDate > today;
      const isToday = dateStr === formatDate(today);
      const month = currDate.getMonth();

      if (!isFuture) {
        if (count > 0) {
          periodSubmissions += count;
          periodActiveDays += 1;
        }
      }

      // Tier logic (0, 1, 2, 3, 4)
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3 && count <= 4) level = 3;
      else if (count >= 5) level = 4;

      currentWeek.push({
        date: new Date(currDate),
        dateStr,
        count,
        level,
        isFuture,
        isToday,
        activities: activityDetails[dateStr] || []
      });

      // Check for month label when column starts
      if (currentWeek.length === 1 && month !== lastMonth && colIndex < 52) {
        monthsArr.push({
          label: MONTH_NAMES[month],
          colIndex
        });
        lastMonth = month;
      }

      // When week reaches 7 days (Sun -> Sat)
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
        colIndex++;
        if (colIndex >= 53) break;
      }

      currDate.setDate(currDate.getDate() + 1);
    }

    if (currentWeek.length > 0 && weeksArr.length < 53) {
      while (currentWeek.length < 7) {
        const dummyDate = new Date(currDate);
        currentWeek.push({
          date: dummyDate,
          dateStr: formatDate(dummyDate),
          count: 0,
          level: 0,
          isFuture: true,
          isToday: false,
          activities: []
        });
        currDate.setDate(currDate.getDate() + 1);
      }
      weeksArr.push(currentWeek);
    }

    return {
      weeks: weeksArr,
      monthLabels: monthsArr,
      totalSubmissions: selectedYear === "current" ? (data?.totalSubmissionsPastYear ?? periodSubmissions) : periodSubmissions,
      totalActiveDays: selectedYear === "current" ? (data?.totalActiveDays ?? periodActiveDays) : periodActiveDays,
      maxStreak: data?.maxStreak || 0,
      currentStreak: data?.currentStreak || 0
    };
  }, [selectedYear, submissionCalendar, activityDetails, data]);

  const handleCellMouseEnter = (cell, e) => {
    if (cell.isFuture) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell(cell);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="activity-heatmap-card" id="activity-heatmap-radar">
      {/* Header Row */}
      <div className="activity-heatmap-header">
        <div className="activity-header-left">
          <span className="activity-submissions-count">
            {totalSubmissions} {title}
          </span>
          <span
            className="activity-info-trigger"
            title="Verified attendance across Institutional Examinations, Cognitive Diagnostic Assessments, and Adaptive Practice Challenges."
          >
            ⓘ
          </span>
        </div>

        {!hideHeaderStats && (
          <div className="activity-header-right">
            <div className="activity-metric-stat">
              <span>Total active days:</span>
              <strong>{totalActiveDays}</strong>
            </div>

            <div className="activity-metric-stat">
              <span>Max streak:</span>
              <strong>{maxStreak}</strong>
            </div>

            {/* Year Selector Dropdown */}
            <div className="activity-year-select-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="activity-year-select-btn"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-label="Filter activity by year"
              >
                <span>{selectedYear === "current" ? "Current" : selectedYear}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>▾</span>
              </button>

              {isDropdownOpen && (
                <div className="activity-year-dropdown-menu">
                  <button
                    type="button"
                    className={`activity-year-option ${selectedYear === "current" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedYear("current");
                      setIsDropdownOpen(false);
                    }}
                  >
                    Current (1 Yr)
                  </button>
                  <button
                    type="button"
                    className={`activity-year-option ${selectedYear === "2026" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedYear("2026");
                      setIsDropdownOpen(false);
                    }}
                  >
                    2026
                  </button>
                  <button
                    type="button"
                    className={`activity-year-option ${selectedYear === "2025" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedYear("2025");
                      setIsDropdownOpen(false);
                    }}
                  >
                    2025
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="activity-heatmap-scroll">
        <div className="activity-grid-container">
          <div className="activity-grid-body">
            {/* Day Labels (Mon, Wed, Fri) */}
            <div className="activity-day-labels">
              {DAY_LABELS.map((dayLabel, idx) => (
                <span key={idx} className="activity-day-label">
                  {dayLabel}
                </span>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="activity-weeks-columns">
              {weeks.map((week, colIdx) => (
                <div key={colIdx} className="activity-week-column">
                  {week.map((cell, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`activity-cell level-${cell.level} ${cell.isFuture ? "is-future" : ""} ${cell.isToday ? "is-today" : ""}`}
                      onMouseEnter={(e) => handleCellMouseEnter(cell, e)}
                      onMouseLeave={handleCellMouseLeave}
                      role="gridcell"
                      aria-label={`${cell.count} submissions on ${cell.dateStr}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Month Labels Underneath the Columns */}
          <div className="activity-months-row">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                className="activity-month-label"
                style={{
                  left: `${m.colIndex * 15}px` // 12px cell + 3px gap = 15px per column
                }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Legend / Streak */}
      <div className="activity-heatmap-footer">
        <div className="activity-streak-summary">
          <span className="activity-streak-flame">
            🔥 {currentStreak}-Day Active Streak
          </span>
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            Real-time verified daily assessment presence
          </span>
        </div>

        <div className="activity-legend">
          <span>Less</span>
          <div className="activity-legend-cells">
            <span className="activity-legend-cell activity-cell level-0" />
            <span className="activity-legend-cell activity-cell level-1" />
            <span className="activity-legend-cell activity-cell level-2" />
            <span className="activity-legend-cell activity-cell level-3" />
            <span className="activity-legend-cell activity-cell level-4" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && (
        <div
          className="activity-tooltip-card"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)"
          }}
        >
          <div className="activity-tooltip-header">
            {hoveredCell.date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </div>

          <div className="activity-tooltip-count">
            {hoveredCell.count === 0
              ? "No assessments attended on this date"
              : `${hoveredCell.count} assessment${hoveredCell.count > 1 ? "s" : ""} attended`}
          </div>

          {hoveredCell.activities.length > 0 && (
            <div className="activity-tooltip-list">
              {hoveredCell.activities.map((act, i) => (
                <div key={i} className="activity-tooltip-item">
                  <div className="activity-tooltip-badge-row">
                    <span
                      className={`activity-type-pill ${
                        act.type === "SCHEDULED_EXAM"
                          ? "scheduled"
                          : act.type === "DIAGNOSTIC_EXAM"
                          ? "diagnostic"
                          : "adaptive"
                      }`}
                    >
                      {act.type === "SCHEDULED_EXAM"
                        ? "Scheduled Exam"
                        : act.type === "DIAGNOSTIC_EXAM"
                        ? "Diagnostic"
                        : "Adaptive Practice"}
                    </span>
                    {act.time && <span className="activity-item-time">{act.time}</span>}
                  </div>
                  <div className="activity-item-title">{act.title}</div>
                  {act.score !== undefined && act.score !== null && (
                    <div className="activity-item-meta">
                      Score: {act.score}% {act.questionsPassed ? `(${act.questionsPassed}/${act.totalQuestions} Passed)` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
