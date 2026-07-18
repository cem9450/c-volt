import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiBatteryCharging,
  FiChevronRight,
  FiCloudRain,
  FiCloudSnow,
  FiSun,
  FiThermometer,
  FiWind,
  FiZap,
} from "react-icons/fi";

const DEFAULT_LOCATION = {
  latitude: 37.5393,
  longitude: 127.2148,
};

const WEATHER_REFRESH_INTERVAL =
  10 * 60 * 1000;

const DATA_REFRESH_INTERVAL =
  30 * 1000;

function normalizeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function getSavedVehicle() {
  try {
    const savedVehicle =
      localStorage.getItem(
        "cvolt_vehicle"
      );

    if (!savedVehicle) {
      return null;
    }

    return JSON.parse(savedVehicle);
  } catch {
    return null;
  }
}

function getVehicleLocation(vehicle) {
  const latitude = normalizeNumber(
    vehicle?.latitude ??
      vehicle?.lat
  );

  const longitude = normalizeNumber(
    vehicle?.longitude ??
      vehicle?.lng ??
      vehicle?.lon
  );

  if (
    latitude !== null &&
    longitude !== null
  ) {
    return {
      latitude,
      longitude,
    };
  }

  return DEFAULT_LOCATION;
}

function getBatteryLevel(vehicle) {
  return normalizeNumber(
    vehicle?.batteryLevel ??
      vehicle?.battery_level
  );
}

function getChargingState(vehicle) {
  return (
    vehicle?.chargingState ??
    vehicle?.charging_state ??
    ""
  )
    .toString()
    .toLowerCase();
}

function isVehicleCharging(vehicle) {
  const chargingState =
    getChargingState(vehicle);

  return [
    "charging",
    "starting",
  ].includes(chargingState);
}

function isRainWeatherCode(code) {
  return [
    51,
    53,
    55,
    56,
    57,
    61,
    63,
    65,
    66,
    67,
    80,
    81,
    82,
    95,
    96,
    99,
  ].includes(code);
}

function isSnowWeatherCode(code) {
  return [
    71,
    73,
    75,
    77,
    85,
    86,
  ].includes(code);
}

function makeInsight({
  drivingData,
  scoreData,
  vehicle,
  weather,
}) {
  const temperature =
    normalizeNumber(
      weather?.temperature
    );

  const precipitationProbability =
    normalizeNumber(
      weather?.precipitationProbability
    ) ?? 0;

  const weatherCode =
    normalizeNumber(
      weather?.weatherCode
    ) ?? 0;

  const windSpeed =
    normalizeNumber(
      weather?.windSpeed
    ) ?? 0;

  const batteryLevel =
    getBatteryLevel(vehicle);

  const charging =
    isVehicleCharging(vehicle);

  const isDriving =
    drivingData?.isDriving === true ||
    vehicle?.isDriving === true;

  const rainExpected =
    isRainWeatherCode(weatherCode) ||
    precipitationProbability >= 60;

  const snowExpected =
    isSnowWeatherCode(weatherCode);

  /*
   * 중요도가 높은 안내부터 표시한다.
   * 눈 → 폭우 → 배터리 → 폭염 → 한파 → 강풍
   * → 운전 중 → 오늘의 운전 분석 → 일반 안내
   */

  if (snowExpected) {
    return {
      type: "snow",
      label: "WEATHER ALERT",
      title: "눈길 운전을 준비하세요",
      message:
        "현재 위치 주변에 눈 예보가 있습니다. 스노우 체인과 겨울용 워셔액을 미리 준비하는 것을 추천드려요.",
      meta:
        temperature !== null
          ? `현재 ${Math.round(
              temperature
            )}° · 눈길 안전 안내`
          : "눈길 안전 안내",
      icon: FiCloudSnow,
      priority: "high",
    };
  }

  if (
    rainExpected &&
    precipitationProbability >= 70
  ) {
    return {
      type: "rain",
      label: "RAIN INSIGHT",
      title: "강한 비가 예상됩니다",
      message:
        "출발 전 와이퍼와 타이어 상태를 확인해 보세요. 빗길에서는 평소보다 충분한 제동거리를 유지하는 것이 좋아요.",
      meta: `강수 확률 ${Math.round(
        precipitationProbability
      )}% · 차량 점검 추천`,
      icon: FiCloudRain,
      priority: "high",
    };
  }

  if (
    batteryLevel !== null &&
    batteryLevel <= 20 &&
    !charging
  ) {
    return {
      type: "battery",
      label: "ENERGY INSIGHT",
      title: `배터리가 ${Math.round(
        batteryLevel
      )}% 남아 있어요`,
      message:
        "다음 운행 전 충전 계획을 세우는 것이 좋습니다. 가까운 슈퍼차저를 미리 확인해 보세요.",
      meta:
        "차량 상태 · 충전 권장",
      icon: FiBatteryCharging,
      priority: "high",
    };
  }

  if (
    temperature !== null &&
    temperature >= 32
  ) {
    return {
      type: "heat",
      label: "CLIMATE INSIGHT",
      title: "차량 내부가 뜨거워질 수 있어요",
      message:
        "출발하기 5분 전 에어컨을 켜두면 더 쾌적하게 탑승할 수 있습니다. 직사광선 아래 장시간 주차는 피해주세요.",
      meta: `현재 ${Math.round(
        temperature
      )}° · 실내 온도 관리`,
      icon: FiSun,
      priority: "medium",
    };
  }

  if (
    temperature !== null &&
    temperature <= -5
  ) {
    return {
      type: "cold",
      label: "WINTER INSIGHT",
      title: "기온이 많이 낮습니다",
      message:
        "저온에서는 주행 가능 거리가 줄어들 수 있어요. 충전 중이라면 출발 전 배터리 예열을 활용해 보세요.",
      meta: `현재 ${Math.round(
        temperature
      )}° · 배터리 예열 추천`,
      icon: FiThermometer,
      priority: "medium",
    };
  }

  if (windSpeed >= 35) {
    return {
      type: "wind",
      label: "SAFETY INSIGHT",
      title: "강한 바람이 불고 있어요",
      message:
        "고속도로와 교량에서는 갑작스러운 횡풍에 주의하세요. 평소보다 속도를 낮추는 것이 안전합니다.",
      meta: `풍속 ${Math.round(
        windSpeed
      )}km/h · 안전 운전 안내`,
      icon: FiWind,
      priority: "medium",
    };
  }

  if (rainExpected) {
    return {
      type: "rain",
      label: "RAIN INSIGHT",
      title: "오늘 비가 올 가능성이 있어요",
      message:
        "와이퍼 작동 상태와 워셔액을 한 번 확인해 보세요. 출발 전 간단한 점검이 빗길 운전에 도움이 됩니다.",
      meta: `강수 확률 ${Math.round(
        precipitationProbability
      )}% · 출발 전 점검`,
      icon: FiCloudRain,
      priority: "medium",
    };
  }

  if (isDriving) {
    return {
      type: "driving",
      label: "LIVE ANALYSIS",
      title: "현재 주행을 분석하고 있어요",
      message:
        "운행이 끝나면 주행 거리와 배터리 효율, AI 운전 점수를 바탕으로 맞춤 코멘트를 알려드릴게요.",
      meta:
        "실시간 차량 데이터 분석 중",
      icon: FiZap,
      priority: "normal",
    };
  }

  if (scoreData?.hasData) {
    const score =
      normalizeNumber(
        scoreData.score
      ) ?? 0;

    const efficiency =
      normalizeNumber(
        scoreData.summary
          ?.batteryEfficiency
      );

    if (score >= 90) {
      return {
        type: "score",
        label: "DRIVING INSIGHT",
        title: `오늘의 운전 점수는 ${Math.round(
          score
        )}점이에요`,
        message:
          efficiency !== null &&
          efficiency > 0
            ? `안정적인 주행을 했습니다. 오늘 배터리 효율은 ${efficiency.toFixed(
                1
              )}km/%를 기록했어요.`
            : "오늘은 부드럽고 안정적인 운전을 했어요. 현재의 운전 습관을 계속 유지해 보세요.",
        meta:
          "오늘의 주행 데이터 분석",
        icon: FiZap,
        priority: "normal",
      };
    }

    return {
      type: "score",
      label: "DRIVING INSIGHT",
      title: `오늘의 운전 점수는 ${Math.round(
        score
      )}점이에요`,
      message:
        scoreData.comment ||
        "다음 주행에서는 급가속과 급감속을 줄이면 더 좋은 점수를 기대할 수 있어요.",
      meta:
        "오늘의 주행 데이터 분석",
      icon: FiZap,
      priority: "normal",
    };
  }

  if (charging) {
    return {
      type: "charging",
      label: "CHARGING INSIGHT",
      title: "차량이 충전 중이에요",
      message:
        "충전이 완료되면 다음 운행을 더 여유롭게 시작할 수 있습니다. 충전 목표와 예상 완료 시간을 확인해 보세요.",
      meta:
        batteryLevel !== null
          ? `현재 배터리 ${Math.round(
              batteryLevel
            )}%`
          : "실시간 충전 상태",
      icon: FiBatteryCharging,
      priority: "normal",
    };
  }

  return {
    type: "default",
    label: "DAILY INSIGHT",
    title: "오늘의 차량 상태는 안정적이에요",
    message:
      "특별한 기상 위험이나 차량 경고가 없습니다. 다음 운행이 시작되면 C-Volt가 실시간으로 분석해 드릴게요.",
    meta:
      temperature !== null
        ? `현재 ${Math.round(
            temperature
          )}° · 실시간 분석 완료`
        : "차량 상태 · 주행 데이터 분석",
    icon: FiZap,
    priority: "normal",
  };
}

export default function AIBriefingCard() {
  const [drivingData, setDrivingData] =
    useState(null);

  const [scoreData, setScoreData] =
    useState(null);

  const [vehicle, setVehicle] =
    useState(getSavedVehicle);

  const [weather, setWeather] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const loadDrivingData =
    useCallback(async () => {
      try {
        const [
          drivingResponse,
          scoreResponse,
        ] = await Promise.all([
          fetch(
            "/api/today-driving",
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
          fetch(
            "/api/today-score",
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

        const [
          drivingJson,
          scoreJson,
        ] = await Promise.all([
          drivingResponse.json(),
          scoreResponse.json(),
        ]);

        if (
          drivingResponse.ok &&
          drivingJson.ok
        ) {
          setDrivingData(
            drivingJson
          );
        }

        if (
          scoreResponse.ok &&
          scoreJson.ok
        ) {
          setScoreData(scoreJson);
        }
      } catch (error) {
        console.error(
          "C-Volt Insight 주행 데이터 조회 실패:",
          error
        );
      }
    }, []);

  const loadWeather =
    useCallback(
      async (
        currentVehicle =
          getSavedVehicle()
      ) => {
        const location =
          getVehicleLocation(
            currentVehicle
          );

        try {
          const params =
            new URLSearchParams({
              latitude:
                location.latitude.toString(),
              longitude:
                location.longitude.toString(),
              current:
                [
                  "temperature_2m",
                  "weather_code",
                  "wind_speed_10m",
                ].join(","),
              hourly:
                "precipitation_probability",
              forecast_days: "1",
              timezone:
                "Asia/Seoul",
            });

          const response =
            await fetch(
              `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
              {
                cache: "no-store",
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              "날씨 정보를 불러오지 못했습니다."
            );
          }

          const currentTime =
            data.current?.time;

          const currentHourIndex =
            Array.isArray(
              data.hourly?.time
            )
              ? data.hourly.time.findIndex(
                  (time) =>
                    time ===
                    currentTime
                )
              : -1;

          const precipitationProbability =
            currentHourIndex >= 0
              ? data.hourly
                  ?.precipitation_probability?.[
                  currentHourIndex
                ]
              : null;

          setWeather({
            temperature:
              data.current
                ?.temperature_2m,
            weatherCode:
              data.current
                ?.weather_code,
            windSpeed:
              data.current
                ?.wind_speed_10m,
            precipitationProbability,
            updatedAt:
              data.current?.time,
          });
        } catch (error) {
          console.error(
            "C-Volt Insight 날씨 조회 실패:",
            error
          );
        }
      },
      []
    );

  const loadInsight =
    useCallback(async () => {
      const savedVehicle =
        getSavedVehicle();

      setVehicle(savedVehicle);

      await Promise.all([
        loadDrivingData(),
        loadWeather(savedVehicle),
      ]);

      setLoading(false);
    }, [
      loadDrivingData,
      loadWeather,
    ]);

  useEffect(() => {
    loadInsight();

    const dataTimer =
      window.setInterval(() => {
        loadDrivingData();
      }, DATA_REFRESH_INTERVAL);

    const weatherTimer =
      window.setInterval(() => {
        loadWeather(
          getSavedVehicle()
        );
      }, WEATHER_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(
        dataTimer
      );

      window.clearInterval(
        weatherTimer
      );
    };
  }, [
    loadDrivingData,
    loadInsight,
    loadWeather,
  ]);

  useEffect(() => {
    function handleVehicleUpdated(
      event
    ) {
      const updatedVehicle =
        event.detail ??
        getSavedVehicle();

      setVehicle(
        updatedVehicle
      );

      loadWeather(
        updatedVehicle
      );
    }

    window.addEventListener(
      "cvolt:vehicle-updated",
      handleVehicleUpdated
    );

    return () => {
      window.removeEventListener(
        "cvolt:vehicle-updated",
        handleVehicleUpdated
      );
    };
  }, [loadWeather]);

  const insight = useMemo(() => {
    if (loading) {
      return {
        type: "loading",
        label: "ANALYZING",
        title:
          "오늘의 정보를 분석하고 있어요",
        message:
          "날씨와 차량 상태, 주행 데이터를 확인하고 있습니다.",
        meta:
          "C-Volt Intelligence",
        icon: FiZap,
        priority: "normal",
      };
    }

    return makeInsight({
      drivingData,
      scoreData,
      vehicle,
      weather,
    });
  }, [
    drivingData,
    loading,
    scoreData,
    vehicle,
    weather,
  ]);

  const InsightIcon =
    insight.icon;

  return (
    <article
      className={`cvolt-insight-card cvolt-insight-${insight.type} cvolt-insight-priority-${insight.priority}`}
    >
      <div className="cvolt-insight-top">
        <div className="cvolt-insight-brand">
  <div>
    <span className="cvolt-insight-name">
      C-VOLT INSIGHT
    </span>

    <span className="cvolt-insight-label">
      {insight.label}
    </span>
  </div>
</div>

        <button
          type="button"
          className="cvolt-insight-more"
          aria-label="C-Volt Insight 자세히 보기"
        >
          <span>자세히</span>
          <FiChevronRight />
        </button>
      </div>

      <div className="cvolt-insight-body">
        <div className="cvolt-insight-icon">
          <InsightIcon />
        </div>

        <div className="cvolt-insight-copy">
          <h2>{insight.title}</h2>

          <p>{insight.message}</p>
        </div>
      </div>

      <div className="cvolt-insight-bottom">
        <span className="cvolt-insight-live-dot" />

        <span>{insight.meta}</span>
      </div>
    </article>
  );
}