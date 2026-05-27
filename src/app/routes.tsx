import { Navigate, createBrowserRouter } from "react-router";
import { MainLayout } from "./layouts/MainLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { EventLayout } from "./layouts/EventLayout";
import { Home } from "./pages/Home";
import { Alerts } from "./pages/Alerts";
import { Profile } from "./pages/Profile";
import { SignIn } from "./pages/SignIn";
import { EventDetail } from "./pages/EventDetail";
import { NotFound } from "./pages/NotFound";
import { AdminEvents } from "./pages/admin/AdminEvents";
import { AdminEventDetail } from "./pages/admin/AdminEventDetail";
import { AdminCreateEvent } from "./pages/admin/AdminCreateEvent";
import { AdminPlayers } from "./pages/admin/AdminPlayers";
import { AdminPlayersList } from "./pages/admin/AdminPlayersList";

export const router = createBrowserRouter([
  { path: "/signin", Component: SignIn },
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Home },
      { path: "alerts", Component: Alerts },
      { path: "profile", Component: Profile },
      { path: "events/:id", Component: EventDetail },
      {
        path: "admin",
        Component: AdminLayout,
        children: [
          { index: true, element: <Navigate to="/admin/events" replace /> },
          { path: "events", Component: AdminEvents },
          { path: "events/create", Component: AdminCreateEvent },
          { path: "events/:id", Component: AdminEventDetail },
          { path: "events/:id/edit", Component: AdminCreateEvent },
          { path: "players", Component: AdminPlayers },
          { path: "players/:level", Component: AdminPlayersList },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
]);
