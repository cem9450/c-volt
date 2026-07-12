import quicksilver from "../assets/quicksilver.png";
import glacierblue from "../assets/glacierblue.png";

export default function TeslaCarImage({ vehicle }) {
  const name = (vehicle?.name || "").toLowerCase();

  const image =
    name.includes("대기리차") || name.includes("ceh")
      ? glacierblue
      : quicksilver;

  return (
    <div
      className={
        vehicle?.isDriving
          ? "tesla-car-wrapper driving"
          : "tesla-car-wrapper"
      }
    >
      <div className="road-lines" />

      <img
        src={image}
        className="tesla-car-image"
        alt="Tesla"
      />
    </div>
  );
}