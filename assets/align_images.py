#!/usr/bin/env python3
"""
Image Alignment Script for ComGarden
Uses feature matching (ORB/SIFT) and homography to align two aerial photos.

Usage:
    python align_images.py <reference_image> <image_to_align> [--output-prefix PREFIX]
"""

import cv2
import numpy as np
import argparse
from typing import Optional


def load_image(path: str) -> np.ndarray:
    """Load an image from path, return as BGR numpy array."""
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {path}")
    return img


def detect_features(img: np.ndarray, method: str = "orb") -> tuple:
    """
    Detect keypoints and compute descriptors.

    Args:
        img: Input image (BGR)
        method: Feature detection method ('orb', 'sift', 'akaze')

    Returns:
        Tuple of (keypoints, descriptors)
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if method == "sift":
        detector = cv2.SIFT_create(nfeatures=5000)
    elif method == "akaze":
        detector = cv2.AKAZE_create()
    else:  # default to ORB
        detector = cv2.ORB_create(nfeatures=5000)

    keypoints, descriptors = detector.detectAndCompute(gray, None)
    print(f"  Detected {len(keypoints)} keypoints using {method.upper()}")
    return keypoints, descriptors


def match_features(desc1: np.ndarray, desc2: np.ndarray, method: str = "orb") -> list:
    """
    Match features between two sets of descriptors.

    Args:
        desc1: Descriptors from first image
        desc2: Descriptors from second image
        method: Matching method (affects distance metric)

    Returns:
        List of good matches after ratio test
    """
    if method == "sift":
        # SIFT uses L2 norm
        bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)
    else:
        # ORB/AKAZE use Hamming distance
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

    # Find 2 best matches for ratio test
    matches = bf.knnMatch(desc1, desc2, k=2)

    # Apply Lowe's ratio test
    good_matches = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good_matches.append(m)

    print(f"  Found {len(good_matches)} good matches after ratio test")
    return good_matches


def find_homography(kp1: list, kp2: list, matches: list, min_matches: int = 10) -> np.ndarray:
    """
    Compute homography matrix from matched keypoints.

    Args:
        kp1: Keypoints from reference image
        kp2: Keypoints from image to align
        matches: List of matches
        min_matches: Minimum matches required

    Returns:
        3x3 homography matrix
    """
    if len(matches) < min_matches:
        raise ValueError(f"Not enough matches: {len(matches)} < {min_matches}")

    # Extract matched point coordinates
    src_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)

    # Find homography using RANSAC
    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)

    inliers = np.sum(mask)
    print(f"  Homography computed with {inliers} inliers out of {len(matches)} matches")

    return H


def align_image(img: np.ndarray, H: np.ndarray, target_size: tuple) -> np.ndarray:
    """
    Warp image using homography matrix.

    Args:
        img: Image to warp
        H: Homography matrix
        target_size: (width, height) of output

    Returns:
        Warped image
    """
    aligned = cv2.warpPerspective(img, H, target_size)
    return aligned


def fft_phase_correlation(img1: np.ndarray, img2: np.ndarray) -> tuple:
    """
    Use FFT phase correlation for sub-pixel translation estimation.
    This refines the alignment after homography.

    Args:
        img1: Reference image (grayscale)
        img2: Image to align (grayscale)

    Returns:
        Tuple of (dx, dy) translation
    """
    # Ensure same size
    h, w = min(img1.shape[0], img2.shape[0]), min(img1.shape[1], img2.shape[1])
    img1 = img1[:h, :w].astype(np.float32)
    img2 = img2[:h, :w].astype(np.float32)

    # Apply window function to reduce edge effects
    window = cv2.createHanningWindow((w, h), cv2.CV_32F)
    img1_windowed = img1 * window
    img2_windowed = img2 * window

    # Compute FFT
    fft1 = np.fft.fft2(img1_windowed)
    fft2 = np.fft.fft2(img2_windowed)

    # Cross-power spectrum
    cross_power = (fft1 * np.conj(fft2)) / (np.abs(fft1 * np.conj(fft2)) + 1e-10)

    # Inverse FFT to get correlation
    correlation = np.fft.ifft2(cross_power)
    correlation = np.abs(correlation)

    # Find peak
    peak_idx = np.unravel_index(np.argmax(correlation), correlation.shape)

    # Convert to translation (handle wrap-around)
    dy = peak_idx[0] if peak_idx[0] < h // 2 else peak_idx[0] - h
    dx = peak_idx[1] if peak_idx[1] < w // 2 else peak_idx[1] - w

    print(f"  FFT phase correlation refinement: dx={dx}, dy={dy}")
    return dx, dy


def compute_overlap_region(img1_shape: tuple, img2_shape: tuple, H: np.ndarray) -> tuple:
    """
    Compute the overlapping region after alignment.

    Returns:
        Tuple of (x, y, width, height) for the overlap region
    """
    h1, w1 = img1_shape[:2]
    h2, w2 = img2_shape[:2]

    # Transform corners of img2
    corners = np.float32([[0, 0], [w2, 0], [w2, h2], [0, h2]]).reshape(-1, 1, 2)
    transformed = cv2.perspectiveTransform(corners, H)

    # Find bounding box of transformed corners
    x_coords = transformed[:, 0, 0]
    y_coords = transformed[:, 0, 1]

    # Overlap is intersection of both image bounds
    x_min = max(0, int(np.min(x_coords)))
    y_min = max(0, int(np.min(y_coords)))
    x_max = min(w1, int(np.max(x_coords)))
    y_max = min(h1, int(np.max(y_coords)))

    return x_min, y_min, x_max - x_min, y_max - y_min


def crop_to_aspect_ratio(img: np.ndarray, aspect_ratio: float = 2/3,
                          center: Optional[tuple] = None) -> np.ndarray:
    """
    Crop image to specified aspect ratio (width/height).

    Args:
        img: Input image
        aspect_ratio: Target width/height ratio (default 2:3 for portrait mobile)
        center: Optional (x, y) center point for crop

    Returns:
        Cropped image
    """
    h, w = img.shape[:2]

    # Calculate target dimensions
    if w / h > aspect_ratio:
        # Image is wider than target - crop width
        new_w = int(h * aspect_ratio)
        new_h = h
    else:
        # Image is taller than target - crop height
        new_w = w
        new_h = int(w / aspect_ratio)

    # Calculate crop position
    if center is None:
        # Center crop
        x = (w - new_w) // 2
        y = (h - new_h) // 2
    else:
        # Crop around specified center
        x = max(0, min(w - new_w, center[0] - new_w // 2))
        y = max(0, min(h - new_h, center[1] - new_h // 2))

    return img[y:y+new_h, x:x+new_w]


def visualize_matches(img1: np.ndarray, kp1: list, img2: np.ndarray, kp2: list,
                      matches: list, output_path: str):
    """Save visualization of matched features."""
    vis = cv2.drawMatches(img1, kp1, img2, kp2, matches[:50], None,
                          flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    cv2.imwrite(output_path, vis)
    print(f"  Saved match visualization to {output_path}")


def align_images(ref_path: str, align_path: str, output_prefix: str = "aligned",
                 method: str = "orb", target_size: tuple = (750, 1080)) -> dict:
    """
    Main alignment function.

    Args:
        ref_path: Path to reference image (segmented with polygons)
        align_path: Path to image to align (clean)
        output_prefix: Prefix for output files
        method: Feature detection method
        target_size: (width, height) for final output

    Returns:
        Dict with paths to output files
    """
    print(f"\n{'='*60}")
    print("ComGarden Image Alignment")
    print(f"{'='*60}")

    # Load images
    print(f"\n1. Loading images...")
    img_ref = load_image(ref_path)
    img_align = load_image(align_path)
    print(f"  Reference: {img_ref.shape[1]}x{img_ref.shape[0]}")
    print(f"  To align:  {img_align.shape[1]}x{img_align.shape[0]}")

    # Detect features
    print(f"\n2. Detecting features ({method})...")
    kp1, desc1 = detect_features(img_ref, method)
    kp2, desc2 = detect_features(img_align, method)

    # Match features
    print(f"\n3. Matching features...")
    matches = match_features(desc1, desc2, method)

    # Visualize matches
    vis_path = f"{output_prefix}_matches.jpg"
    visualize_matches(img_ref, kp1, img_align, kp2, matches, vis_path)

    # Compute homography
    print(f"\n4. Computing homography...")
    H = find_homography(kp1, kp2, matches)
    print(f"  Homography matrix:\n{H}")

    # Align the clean image to reference
    print(f"\n5. Warping image...")
    aligned = align_image(img_align, H, (img_ref.shape[1], img_ref.shape[0]))

    # Optional: FFT refinement
    print(f"\n6. FFT phase correlation refinement...")
    gray_ref = cv2.cvtColor(img_ref, cv2.COLOR_BGR2GRAY)
    gray_aligned = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
    dx, dy = fft_phase_correlation(gray_ref, gray_aligned)

    # Apply sub-pixel refinement if significant
    if abs(dx) > 0 or abs(dy) > 0:
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        aligned = cv2.warpAffine(aligned, M, (aligned.shape[1], aligned.shape[0]))

    # Compute overlap region
    print(f"\n7. Computing overlap region...")
    x, y, w, h = compute_overlap_region(img_ref.shape, img_align.shape, H)
    print(f"  Overlap: x={x}, y={y}, w={w}, h={h}")

    # Crop both images to overlap region
    ref_cropped = img_ref[y:y+h, x:x+w]
    aligned_cropped = aligned[y:y+h, x:x+w]

    # Crop to target aspect ratio (2:3 for portrait mobile)
    print(f"\n8. Cropping to {target_size[0]}x{target_size[1]} (2:3 ratio)...")
    aspect_ratio = target_size[0] / target_size[1]
    ref_final = crop_to_aspect_ratio(ref_cropped, aspect_ratio)
    aligned_final = crop_to_aspect_ratio(aligned_cropped, aspect_ratio)

    # Resize to target size
    ref_final = cv2.resize(ref_final, target_size, interpolation=cv2.INTER_LANCZOS4)
    aligned_final = cv2.resize(aligned_final, target_size, interpolation=cv2.INTER_LANCZOS4)

    # Save outputs
    print(f"\n9. Saving outputs...")
    ref_output = f"{output_prefix}_reference.jpg"
    aligned_output = f"{output_prefix}_clean.jpg"

    cv2.imwrite(ref_output, ref_final, [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(aligned_output, aligned_final, [cv2.IMWRITE_JPEG_QUALITY, 90])

    print(f"  Saved: {ref_output} ({ref_final.shape[1]}x{ref_final.shape[0]})")
    print(f"  Saved: {aligned_output} ({aligned_final.shape[1]}x{aligned_final.shape[0]})")

    # Create a blended comparison image
    blend = cv2.addWeighted(ref_final, 0.5, aligned_final, 0.5, 0)
    blend_output = f"{output_prefix}_blend.jpg"
    cv2.imwrite(blend_output, blend, [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(f"  Saved: {blend_output} (50/50 blend for verification)")

    print(f"\n{'='*60}")
    print("Alignment complete!")
    print(f"{'='*60}\n")

    return {
        "reference": ref_output,
        "aligned": aligned_output,
        "blend": blend_output,
        "matches_viz": vis_path,
        "homography": H.tolist()
    }


def main():
    parser = argparse.ArgumentParser(
        description="Align two aerial images using feature matching",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python align_images.py garden_segmented.png garden1_cropped.png
  python align_images.py ref.png clean.png --output-prefix garden --method sift
        """
    )
    parser.add_argument("reference", help="Reference image (with polygon annotations)")
    parser.add_argument("to_align", help="Image to align (clean version)")
    parser.add_argument("--output-prefix", "-o", default="aligned",
                        help="Prefix for output files (default: aligned)")
    parser.add_argument("--method", "-m", choices=["orb", "sift", "akaze"],
                        default="sift", help="Feature detection method (default: sift)")
    parser.add_argument("--width", "-W", type=int, default=750,
                        help="Output width (default: 750)")
    parser.add_argument("--height", "-H", type=int, default=1080,
                        help="Output height (default: 1080)")

    args = parser.parse_args()

    result = align_images(
        args.reference,
        args.to_align,
        args.output_prefix,
        args.method,
        (args.width, args.height)
    )

    print("Output files:")
    for key, value in result.items():
        if key != "homography":
            print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
