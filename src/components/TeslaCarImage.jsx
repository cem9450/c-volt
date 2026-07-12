import quicksilver from "../assets/quicksilver.jpg";
import glacierblue from "../assets/glacierblue.jpg";

export default function TeslaCarImage({ vehicle }) {
  const name = (vehicle?.name || "").toLowerCase();

  const image =
    name.includes("대기리차") || name.includes("ceh")
      ? glacierblue
      : quicksilver;

  return (
    <img
      src={image}
      className="tesla-car-image"
      alt="Tesla"
    />
  );
}