package org.horsefaced.livestream.app;

import android.annotation.TargetApi;
import android.app.Fragment;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.*;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.*;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;


@TargetApi(Build.VERSION_CODES.LOLLIPOP)
public class VideoFragment extends Fragment implements TextureView.SurfaceTextureListener {

    private TextureView localVideo;
    private CameraDevice cameraDevice;

    private Semaphore cameraLock = new Semaphore(1);
    private Handler mainHandler = new Handler();
    private CaptureRequest.Builder cameraPreviewBuilder;
    private Canvas localCanvas = new Canvas();

    private CameraDevice.StateCallback stateCallback = new CameraDevice.StateCallback() {
        @Override
        public void onOpened(CameraDevice camera) {
            cameraDevice = camera;
            startLocal();
            cameraLock.release();
        }

        @Override
        public void onDisconnected(CameraDevice camera) {
            cameraLock.release();
            camera.close();
            cameraDevice = null;
        }

        @Override
        public void onError(CameraDevice camera, int error) {
            cameraLock.release();
            camera.close();
            cameraDevice = null;
        }
    };
    private Surface localSurface;

    public static VideoFragment newInstance() {
        return new VideoFragment();
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        return inflater.inflate(R.layout.fragment_video, container, false);
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        localVideo = (TextureView) view.findViewById(R.id.local);
        localVideo.setSurfaceTextureListener(this);

        localCanvas.setBitmap(Bitmap.createBitmap(640, 480, Bitmap.Config.ARGB_8888));
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        localSurface = new Surface(surface);
        openCamera();
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    private void openCamera() {
        CameraManager manager = (CameraManager) getActivity().getSystemService(Context.CAMERA_SERVICE);

        try {
            cameraLock.acquire();

            for (String cameraId : manager.getCameraIdList()) {
                CameraCharacteristics cameraCharacteristics = manager.getCameraCharacteristics(cameraId);
                if (cameraCharacteristics.get(cameraCharacteristics.LENS_FACING) == cameraCharacteristics.LENS_FACING_FRONT) {
                    manager.openCamera(cameraId, stateCallback, mainHandler);
                    return;
                }
            }

        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
        Toast.makeText(getActivity(), "Open Camera Error!", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {

    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
        return false;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surface) {
        Canvas canvas = localSurface.lockCanvas(null);
        try {
            Bitmap bitmap = Bitmap.createBitmap(640, 480, Bitmap.Config.ARGB_8888);
            canvas.setBitmap(bitmap);
            localCanvas.drawBitmap(bitmap, 0, 0, null);

        } finally {
            localSurface.unlockCanvasAndPost(canvas);
        }

    }

    private void startLocal() {
        List<Surface> surfaces = new ArrayList<>();
        try {
            cameraPreviewBuilder = cameraDevice.createCaptureRequest(cameraDevice.TEMPLATE_RECORD);
            surfaces.add(localSurface);
            cameraPreviewBuilder.addTarget(localSurface);

            cameraDevice.createCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(CameraCaptureSession session) {
                    try {
                        session.setRepeatingRequest(cameraPreviewBuilder.build(), null, mainHandler);
                    } catch (CameraAccessException e) {
                        e.printStackTrace();
                    }
                }

                @Override
                public void onConfigureFailed(CameraCaptureSession session) {
                    Toast.makeText(getActivity(), "Capture Session Failed!", Toast.LENGTH_SHORT).show();
                }
            }, mainHandler);
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
    }
}
