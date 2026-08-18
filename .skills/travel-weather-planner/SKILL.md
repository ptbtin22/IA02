---
name: travel-weather-planner
description: Provide a travel weather advisory, 3-day forecast, air quality metrics, and packing recommendations for a target city
---

# Travel Weather Planner Procedural Guide

Follow these sequential steps when the user asks for travel weather advice, packing recommendations, or a weather briefing for a city:

1. **Step 1 — Query Current Weather**:
   Call `get_current_weather` with the requested city name (defaults to "Saigon").

2. **Step 2 — Query 3-Day Forecast**:
   Call `get_weather_forecast` for the same city name.

3. **Step 3 — Query Air Quality Index**:
   Call `get_air_quality` for the target city to retrieve AQI and PM2.5 metrics.

4. **Step 4 — Generate Travel & Packing Advisory**:
   Structure your final response with:
   - 🌡️ **Current Conditions**: Temperature, feels-like, and weather summary.
   - 📅 **3-Day Forecast**: Day-by-day temperature range and conditions.
   - 😷 **Air Quality Warning**: AQI index rating and health recommendations.
   - 🧳 **Packing & Outfit Checklist**: Clothing suggestions, umbrella alert, and sunscreen advice.
