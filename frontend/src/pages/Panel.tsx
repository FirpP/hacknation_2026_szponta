import H1 from "@/components/ui/H1";
import { useMe } from "@/features/auth/auth.hooks";

// Strona chroniona przez <RequireAuth> w App.tsx - tu użytkownik jest zawsze zalogowany
const Panel = () => {
  const { data: me } = useMe();

  return (
    <>
      <H1>Panel</H1>
      <p>
        Zalogowany jako <strong>{me?.username}</strong>
      </p>
    </>
  );
};

export default Panel;
