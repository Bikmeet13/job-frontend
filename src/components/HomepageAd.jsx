import { useEffect, useRef } from "react";

const AD_CLIENT = "ca-pub-9919940051667749";
const AD_SLOT = "7386784972";

function HomepageAd({ className = "" }) {
  const adRef = useRef(null);

  useEffect(() => {
    const ad = adRef.current;

    // Prevent a second request if React re-renders this homepage component.
    if (!ad || ad.dataset.adInitialized) return;

    ad.dataset.adInitialized = "true";

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("Unable to load the homepage ad.", error);
    }
  }, []);

  return (
    <section className={`w-full ${className}`} aria-label="Advertisement">
      <p className="text-center text-xs uppercase tracking-wider text-gray-500 mb-2">
        Advertisement
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}

export default HomepageAd;
