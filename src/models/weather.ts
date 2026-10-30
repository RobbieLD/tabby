export interface WeatherLocation {
    name: string;
    latitude: number;
    longitude: number;
    source: "manual" | "browser" | "preview";
}

export interface CurrentWeather {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number | null;
    humidity: number | null;
    pressure: number | null;
    minimumTemperature: number | null;
    maximumTemperature: number | null;
}
