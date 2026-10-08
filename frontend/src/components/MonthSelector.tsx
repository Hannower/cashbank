import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import {
  MonthItem,
  MONTH_LABELS,
  FULL_MONTH_NAMES,
  getCreationDateDetails,
  getCurrentMonthItem,
} from '../utils/dateUtils';

export type { MonthItem };

interface MonthSelectorProps {
  selectedMonth: MonthItem;
  onSelectMonth: (month: MonthItem) => void;
  createdAt?: string;
  showYearPicker?: boolean;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onSelectMonth,
  createdAt,
  showYearPicker = true,
}) => {
  const { user } = useAuth();
  const effectiveCreatedAt = createdAt || user?.createdAt;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // Future month expansion state (default 36 months forward from start or current)
  const [extraMonthsForward, setExtraMonthsForward] = useState<number>(36);

  const { startMonth, startYear } = useMemo(() => {
    return getCreationDateDetails(effectiveCreatedAt);
  }, [effectiveCreatedAt]);

  const currentMonthItem = useMemo(() => getCurrentMonthItem(), []);

  // Generate list of months starting precisely at user creation month
  const months = useMemo(() => {
    const list: MonthItem[] = [];
    let curM = startMonth;
    let curY = startYear;

    const totalMonthsToGenerate = Math.max(extraMonthsForward, 24);

    for (let i = 0; i < totalMonthsToGenerate; i++) {
      const isCur = curM === currentMonthItem.month && curY === currentMonthItem.year;
      const isCre = curM === startMonth && curY === startYear;

      list.push({
        month: curM,
        year: curY,
        label: MONTH_LABELS[curM - 1],
        yearLabel: String(curY),
        isCurrent: isCur,
        isCreation: isCre,
      });

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return list;
  }, [startMonth, startYear, extraMonthsForward, currentMonthItem]);

  // Available unique years in the generated list
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(months.map((m) => m.year)));
    return years.sort((a, b) => a - b);
  }, [months]);

  // Scroll active item into view on mount or when selectedMonth changes
  useEffect(() => {
    if (selectedButtonRef.current && scrollContainerRef.current) {
      selectedButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedMonth.month, selectedMonth.year]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
      // If close to end, add more future months dynamically
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 300) {
        setExtraMonthsForward((prev) => prev + 12);
      }
    }
  };

  const handleJumpToCurrent = () => {
    onSelectMonth(currentMonthItem);
  };

  const handleYearChange = (targetYear: number) => {
    const matched = months.find((m) => m.year === targetYear && m.month === selectedMonth.month)
      || months.find((m) => m.year === targetYear)
      || months[0];
    if (matched) {
      onSelectMonth(matched);
    }
  };

  const isCurrentMonthSelected =
    selectedMonth.month === currentMonthItem.month && selectedMonth.year === currentMonthItem.year;

  return (
    <div className="month-carousel-container">
      {/* Top Bar: Controls, Year Selector & Quick jump */}
      <div className="month-carousel-header">
        <div className="month-carousel-info">
          <div className="month-carousel-icon">
            <Calendar size={15} />
          </div>
          <span className="month-carousel-label">
            Período<span className="desktop-only-inline"> selecionado</span>:
          </span>
          <span className="month-carousel-badge">
            {FULL_MONTH_NAMES[selectedMonth.month - 1]} de {selectedMonth.year}
          </span>
        </div>

        <div className="month-carousel-actions">
          <div className="month-carousel-selectors">
            {showYearPicker && (
              <div className="year-picker-container">
                <span className="year-picker-label">Ano:</span>
                <select
                  value={selectedMonth.year}
                  onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                  className="year-picker-select"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isCurrentMonthSelected && (
              <button
                onClick={handleJumpToCurrent}
                className="btn-current-month"
                title="Voltar para o mês atual"
              >
                <RotateCcw size={12} />
                <span>Mês atual</span>
              </button>
            )}
          </div>

          {/* Carousel Arrow Buttons */}
          <div className="carousel-nav-arrows">
            <button
              onClick={handleScrollLeft}
              className="carousel-arrow-btn"
              title="Meses anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleScrollRight}
              className="carousel-arrow-btn"
              title="Próximos meses"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Month Carousel Scrollable Strip */}
      <div className="month-carousel-track-wrapper">
        <div
          ref={scrollContainerRef}
          className="month-carousel-track"
        >
          {months.map((m) => {
            const isSelected = selectedMonth.month === m.month && selectedMonth.year === m.year;

            return (
              <button
                key={`${m.month}-${m.year}`}
                ref={isSelected ? selectedButtonRef : undefined}
                onClick={() => onSelectMonth(m)}
                className={`month-pill ${isSelected ? 'selected' : ''}`}
              >
                {/* Indicator for Current Month */}
                {m.isCurrent && (
                  <span className="current-dot" title="Mês atual" />
                )}

                <span className="month-pill-label">
                  {m.label}
                </span>
                <span className="month-pill-year">
                  {m.yearLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .month-carousel-container {
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          padding: 14px 18px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .month-carousel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .month-carousel-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .month-carousel-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background-color: #ecfdf5;
          color: #15803d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .month-carousel-label {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }

        .month-carousel-badge {
          font-size: 13px;
          font-weight: 800;
          color: #15803d;
          background-color: #ecfdf5;
          padding: 3px 12px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .month-carousel-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .month-carousel-selectors {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .year-picker-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .year-picker-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .year-picker-select {
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          background-color: #ffffff;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .year-picker-select:hover {
          border-color: #cbd5e1;
        }

        .btn-current-month {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
          background-color: #f0fdf4;
          color: #166534;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-current-month:hover {
          background-color: #dcfce7;
          border-color: #86efac;
        }

        .carousel-nav-arrows {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .carousel-arrow-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .carousel-arrow-btn:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .month-carousel-track-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .month-carousel-track {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 2px 6px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }

        .month-carousel-track::-webkit-scrollbar {
          display: none;
        }

        .month-pill {
          flex: 0 0 auto;
          min-width: 76px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          color: #334155;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          scroll-snap-align: start;
          box-sizing: border-box;
        }

        .month-pill:hover:not(.selected) {
          background-color: #ffffff;
          border-color: #cbd5e1;
        }

        .month-pill.selected {
          border-color: #15803d;
          background-color: #15803d;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(21, 128, 61, 0.22);
        }

        .current-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #15803d;
        }

        .month-pill.selected .current-dot {
          background-color: #ffffff;
        }

        .month-pill-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .month-pill.selected .month-pill-label {
          font-weight: 800;
        }

        .month-pill-year {
          font-size: 10px;
          font-weight: 600;
          opacity: 0.65;
          margin-top: 2px;
        }

        .month-pill.selected .month-pill-year {
          opacity: 0.9;
        }

        /* Tablet & Mobile Responsiveness */
        @media (max-width: 720px) {
          .month-carousel-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .month-carousel-info {
            justify-content: space-between;
            width: 100%;
          }

          .month-carousel-actions {
            justify-content: space-between;
            width: 100%;
          }

          .month-carousel-container {
            padding: 12px 14px;
            border-radius: 14px;
            margin-bottom: 20px;
          }

          .month-pill {
            min-width: 68px;
            padding: 8px 10px;
            border-radius: 10px;
          }

          .month-pill-label {
            font-size: 13px;
          }
        }

        /* Small Smartphone Responsiveness */
        @media (max-width: 480px) {
          .month-carousel-container {
            padding: 10px 10px;
            border-radius: 12px;
            margin-bottom: 16px;
          }

          .desktop-only-inline {
            display: none;
          }

          .month-carousel-label {
            font-size: 12px;
          }

          .month-carousel-badge {
            font-size: 12px;
            padding: 2px 10px;
          }

          .month-pill {
            min-width: 60px;
            padding: 7px 6px;
            border-radius: 9px;
          }

          .month-pill-label {
            font-size: 12px;
          }

          .month-pill-year {
            font-size: 9px;
          }

          .btn-current-month {
            padding: 4px 8px;
            font-size: 11px;
          }

          .carousel-arrow-btn {
            width: 30px;
            height: 30px;
          }
        }
      `}</style>
    </div>
  );
};

