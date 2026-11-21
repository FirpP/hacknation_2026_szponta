import H1 from "@/components/ui/H1";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <>
      <H1>404</H1>
      <p>Takiej strony nie ma.</p>
      <Link to="/">Wróć na stronę główną</Link>
    </>
  );
};

export default NotFound;
