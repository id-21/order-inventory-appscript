getState
▸ getState(): Html5QrcodeScannerState

Gets state of the camera scan.

Returns
Html5QrcodeScannerState

state of type ScannerState.

Defined in
html5-qrcode.ts:539

pause
▸ pause(shouldPauseVideo?): void

Pauses the ongoing scan.

Throws

error if method is called when scanner is not in scanning state.

Parameters
Name	Type	Description
shouldPauseVideo?	boolean	(Optional, default = false) If true the video will be paused.
Returns
void

Defined in
html5-qrcode.ts:480

resume
▸ resume(): void

Resumes the paused scan.

If the video was previously paused by setting shouldPauseVideo`` to true` in (shouldPauseVideo), calling this method will resume the video.

Note: with this caller will start getting results in success and error callbacks.

Throws

error if method is called when scanner is not in paused state.

Returns
void

Defined in
html5-qrcode.ts:508

scanFile
▸ scanFile(imageFile, showImage?): Promise<string>

Scans an Image File for QR Code.

This feature is mutually exclusive to camera-based scanning, you should call stop() if the camera-based scanning was ongoing.

Parameters
Name	Type	Description
imageFile	File	a local file with Image content.
showImage?	boolean	if true the Image will be rendered on given element.
Returns
Promise<string>

Promise with decoded QR code string on success and error message on failure. Failure could happen due to different reasons:

QR Code decode failed because enough patterns not found in image.
Input file was not image or unable to load the image or other image load errors.
Defined in
html5-qrcode.ts:615