import { getCurrentVehicleData } from "./_vehicle-data";

export default async function handler(req, res) {
  try {
    const vehicle = await getCurrentVehicleData(req);

    return res.status(200).json({
      ok: true,
      vehicle,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message,
      details: error.details || null,
    });
  }
}