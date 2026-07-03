import { Link } from "react-router-dom";
import { Personal } from "../Personal";

export function PersonalModul() {
  return (
    <div>
      <p>
        <Link to="/moderator/module">← Zurück zu den Modulen</Link>
      </p>

      <Personal />
    </div>
  );
}
