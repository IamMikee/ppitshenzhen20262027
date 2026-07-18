"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function usePreviousRoute(steps = 2) {
    const pathname = usePathname();
    const [previousRoutes, setPreviousRoutes] = useState([]);
    const ref = useRef([]);

    useEffect(() => {
        if (ref.current[ref.current.length - 1] !== pathname) {
            ref.current.push(pathname);
            console.log(ref.current)

            // keep only the last `steps` routes
            if (ref.current.length > steps) {
                ref.current.shift();
            }

            setPreviousRoutes([...ref.current]);
        }
    }, [pathname, steps]);
    const previousRoute =
  previousRoutes.length > 1
    ? previousRoutes[previousRoutes.length - 2] === "/login"
      ? previousRoutes[previousRoutes.length - 3] || "/"
      : previousRoutes[previousRoutes.length - 2]
    : "/";
    return previousRoute;
}