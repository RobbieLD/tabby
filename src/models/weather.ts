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
}
