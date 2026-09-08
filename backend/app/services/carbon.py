from app.models.schemas import CarbonFootprintDetail


def calculate_carbon_footprint(population_served: int, radius_m: int = 400) -> CarbonFootprintDetail:
    """
    Menghitung estimasi dekarbonisasi / reduksi emisi CO2e berdasarkan benchmark transportasi perkotaan (IPCC, WRI, Kemenhub):
    - Modal Shift: estimasi komuter yang beralih dari sepeda motor & mobil pribadi ke angkutan umum (Suroboyo Bus / Feeder)
    - Rata-rata komuter harian per penduduk terlayani dalam radius halte: ~1.5% populasi terlayani aktif per hari
    - Rata-rata jarak tempuh komuter Surabaya (round trip): 16 km/hari
    - Net Avoided Emissions: ~0.092 kg CO2 / passenger-km (selisih kendaraan pribadi ~0.12 kg/km vs angkutan umum ~0.03 kg/km)
    - Hari aktif komuter per tahun: ~300 hari
    - 1 pohon dewasa menyerap ~22 kg CO2 per tahun
    - 1 liter bahan bakar (BBM) menghasilkan ~2.31 kg CO2
    """
    if population_served <= 0:
        return CarbonFootprintDetail(
            co2_reduction_tons_year=0.0,
            tree_equivalent=0,
            daily_vehicle_trips_reduced=0,
            annual_fuel_liters_saved=0,
        )

    # Estimasi perjalanan komuter harian yang beralih ke transit
    daily_trips = max(5, int(population_served * 0.015))
    
    # Reduksi emisi harian (kg CO2)
    daily_co2_kg = daily_trips * 16.0 * 0.092
    
    # Reduksi emisi tahunan dalam ton (300 hari aktif komuter)
    annual_co2_tons = round((daily_co2_kg * 300.0) / 1000.0, 1)
    
    # Ekuivalensi penyerapan pohon dewasa per tahun (1 pohon = 22 kg CO2/thn)
    trees = int((annual_co2_tons * 1000.0) / 22.0)
    
    # Estimasi penghematan bahan bakar tahunan (liter)
    fuel_liters = int((annual_co2_tons * 1000.0) / 2.31)

    return CarbonFootprintDetail(
        co2_reduction_tons_year=annual_co2_tons,
        tree_equivalent=trees,
        daily_vehicle_trips_reduced=daily_trips,
        annual_fuel_liters_saved=fuel_liters,
    )
