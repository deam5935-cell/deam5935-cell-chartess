import React, { useEffect, useState } from 'react';
import { DEFAULT_LOGO } from '../../lib/constants';

interface LogoProps {
  src?: string;
  alt?: string;
  className?: string;
  onLoad?: () => void;
  forceWhite?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ src, alt = "Logo", className, onLoad, forceWhite = true }) => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const logoUrl = src || DEFAULT_LOGO;

  useEffect(() => {
    let isMounted = true;
    
    const processLogo = async () => {
      try {
        const urlToProcess = logoUrl;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = urlToProcess;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          if (isMounted) setProcessedUrl(urlToProcess);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample top-left pixel as potential background color
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const bgA = data[3];

        // Only use corner as reference if it's opaque and relatively light
        const useCornerRef = bgA > 200 && (bgR > 120 || bgG > 120 || bgB > 120);
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          let isBackground = false;

          // 1. Precise background check against the sampled corner
          if (useCornerRef) {
            const distance = Math.sqrt(
              Math.pow(r - bgR, 2) + 
              Math.pow(g - bgG, 2) + 
              Math.pow(b - bgB, 2)
            );
            // If it's very close to the corner color, it's background
            if (distance < 45) {
              isBackground = true;
            }
          }
          
          // 2. Brightness check (catch remaining white/light grey dust)
          if (!isBackground && r > 215 && g > 215 && b > 215) {
            isBackground = true;
          }

          if (isBackground) {
            data[i + 3] = 0; // Make background fully transparent
          } else if (forceWhite && a > 10) {
            // TARGET THE TEXT:
            // If it's NOT background and has any visibility, it's the logo/text.
            // Force it to solid, opaque PURE white.
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255; 
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        if (isMounted) {
          // Double down on whiteness with a filter if forceWhite is true
          if (forceWhite) {
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          setProcessedUrl(canvas.toDataURL("image/png"));
          if (onLoad) onLoad();
        }
      } catch (err) {
        console.error("Logo processing failed:", err);
        if (isMounted) {
          setProcessedUrl(logoUrl);
          if (onLoad) onLoad();
        }
      }
    };

    processLogo();
    
    return () => {
      isMounted = false;
    };
  }, [logoUrl, onLoad]);

  if (!processedUrl) {
    return <div className={className} />; // Placeholder while processing
  }

  return (
    <img 
      src={processedUrl} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer"
    />
  );
};
