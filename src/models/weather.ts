export interface WeatherLocation {
    name: string;
    latitude: number;
    longitude: number;
}

export interface CurrentWeather {
    temperature: number;
    apparentTemperature: number;
    weatherCode: number;
    windSpeed: number;
}
