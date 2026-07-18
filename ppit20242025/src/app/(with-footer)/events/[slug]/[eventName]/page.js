import EventsGallery from "../../EventsGallery";
import EventTabs from "../../EventTabs";
import { EVENTS_BY_YEAR } from "../../../../../lib/events";

export const revalidate = 3600;

export default async function EventPage({ params }) {
  const { slug, eventName } = await params;

  const events = EVENTS_BY_YEAR[slug] || [];
  const event = events.find((e) => e.slug === eventName);

  if (!event) {
    return <div className="pt-32 px-6 text-red-500">Event not found</div>;
  }

  return (
    <div className="pt-32 bg-[#7E0C0E] relative overflow-hidden">
			{/* Right repeating batik */}
			<div
				className="absolute w-[120px] sm:w-[230px] h-full inset-y-0 bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y z-10 right-0 bg-[length:120px_auto] sm:bg-[length:230px_auto]"
			/>

			{/* Left repeating batik */}
			<div
				className="absolute w-[120px] sm:w-[230px] h-full inset-y-0 scale-x-[-1] bg-[url('/Home/motif_batik_hp.webp')] sm:bg-[url('/Home/motif_batik.webp')] opacity-10 bg-repeat-y z-10 left-0 bg-[length:120px_auto]  sm:bg-[length:230px_auto]"
			/>

      {/* EVENT HEADER */}
      <section className="max-w-6xl mx-3 px-6 pb-10 z-10">
        <h1 className="text-4xl md:text-5xl font-bold font-cinzel mb-6 text-white">
          Event Highlights
        </h1>

        <h2 className="text-3xl font-semibold font-cinzel text-white mb-2">
          {event.title}
        </h2>

        <p className="font-montserrat text-white max-w-3xl mb-1">
          {event.description}
        </p>

        <p className="text-white font-montserrat italic text-sm">
        Download full photos here:{" "}
        <a
          href={event.downloadLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          First Link
        </a>

        {eventName === "Riang-Ria-Nusantara" && (
          <>
            {" "} |{" "}
            <a
              href={event.secondDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Second link
            </a>
          </>
        )}

        {eventName === "Riang-Ria-Nusantara" && (
          <>
            {" "} |{" "}
            <a
              href={event.thirdDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Third link
            </a>
          </>
        )}
      </p>
      </section>

      <div className="relative z-10 mb-5">
        <EventTabs slug={slug} events={events} />
        <EventsGallery folder={`events/${slug}/${eventName}`} />
      </div>
    </div>
  );
}
