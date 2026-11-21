import { useState } from "react";
import Button from "@/components/ui/Button";
import H1 from "@/components/ui/H1";

const Home = () => {
  const [count, setCount] = useState(0);

  return (
    <>
      <H1>Home</H1>
      <p>Kliknięć: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Kliknij mnie</Button>
    </>
  );
};

export default Home;
