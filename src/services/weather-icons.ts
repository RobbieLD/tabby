export type WeatherIcon =
    | "clear"
    | "few-clouds"
    | "scattered-clouds"
    | "broken-clouds"
    | "shower-rain"
    | "rain"
    | "thunderstorm"
    | "snow"
    | "mist";

export const getWeatherIcon = (weatherCode: number): WeatherIcon => {
    if (weatherCode === 0) {
        return "clear";
    }
    if (weatherCode === 1) {
        return "few-clouds";
    }
    if (weatherCode === 2) {
        return "scattered-clouds";
    }
    if (weatherCode === 45 || weatherCode === 48) {
        return "mist";
    }
    if (
        (weatherCode >= 51 && weatherCode <= 57) ||
        (weatherCode >= 80 && weatherCode <= 82)
    ) {
        return "shower-rain";
    }
    if (weatherCode >= 61 && weatherCode <= 65) {
        return "rain";
    }
    if (
        (weatherCode >= 66 && weatherCode <= 77) ||
        weatherCode === 85 ||
        weatherCode === 86
    ) {
        return "snow";
    }
    if (weatherCode >= 95 && weatherCode <= 99) {
        return "thunderstorm";
    }
    return "broken-clouds";
};
