import { useEffect, useState } from "react";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 18) return "Good Afternoon";
  if (hour >= 18 && hour < 22) return "Good Evening";

  return "Good Night";
}

export default function UserGreeting() {
  const [vehicleName, setVehicleName] = useState("Tesla");

  useEffect(() => {
    fetch("/api/vehicles", {
  credentials: "include",
})
      .then((response) => response.json())
      .then((data) => {
        const name = data.vehicles?.[0]?.name;

        if (data.ok && name) {
          setVehicleName(name);
        }
      })
      .catch((error) => {
        console.error("차량 이름 불러오기 실패:", error);
      });
  }, []);

  return (
    <section className="greeting">
      <h1>{getGreeting()}</h1>
     <p>
  Welcome back to <strong>{vehicleName}</strong>
</p>
    </section>
  );
}