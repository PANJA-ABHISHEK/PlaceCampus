"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** A <video> bound to a MediaStream. Local previews are muted and mirrored. */
export function VideoSurface({
  stream,
  muted = false,
  mirrored = false,
  className,
}: {
  stream: MediaStream;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [tracks, setTracks] = React.useState(0);

  // Remote streams gain tracks after mounting; re-render when they do.
  React.useEffect(() => {
    const update = () => setTracks(stream.getTracks().length);
    update();
    stream.addEventListener("addtrack", update);
    stream.addEventListener("removetrack", update);
    return () => {
      stream.removeEventListener("addtrack", update);
      stream.removeEventListener("removetrack", update);
    };
  }, [stream]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    void el.play().catch(() => {
      /* autoplay with sound can be blocked until the user interacts; the join click counts */
    });
  }, [stream, tracks]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn(mirrored && "-scale-x-100", className)}
    />
  );
}
