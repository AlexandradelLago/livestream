package org.horsefaced.livestream.app;

import android.annotation.TargetApi;
import android.app.Fragment;
import android.content.Context;
import android.graphics.ImageFormat;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.*;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.ImageReader;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.util.Size;
import android.view.*;
import android.widget.Toast;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.concurrent.Semaphore;


@TargetApi(Build.VERSION_CODES.LOLLIPOP)
public class VideoFragment extends Fragment implements TextureView.SurfaceTextureListener, ImageReader.OnImageAvailableListener {

    private TextureView localVideo;
    private CameraDevice cameraDevice;

    private Semaphore cameraLock = new Semaphore(1);
    private Handler mainHandler = new Handler();
    private ImageReader localImageReader;

    private CameraDevice.StateCallback stateCallback = new CameraDevice.StateCallback() {
        @Override
        public void onOpened(CameraDevice camera) {
            cameraLock.release();
            cameraDevice = camera;
            startLocal();
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
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;

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

        backgroundThread = new HandlerThread("LocalImageCaptureThread");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());

        localVideo = (TextureView) view.findViewById(R.id.local);
        localVideo.setSurfaceTextureListener(this);
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        localSurface = new Surface(surface);
        openCamera(width, height);
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

    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    private void openCamera(int width, int height) {
        CameraManager manager = (CameraManager) getActivity().getSystemService(Context.CAMERA_SERVICE);

        try {
            cameraLock.acquire();

            for (String cameraId : manager.getCameraIdList()) {
                CameraCharacteristics cameraCharacteristics = manager.getCameraCharacteristics(cameraId);
                if (cameraCharacteristics.get(cameraCharacteristics.LENS_FACING) != cameraCharacteristics.LENS_FACING_FRONT)
                    continue;

                StreamConfigurationMap map = cameraCharacteristics.get(cameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                if (map == null) continue;

                Size largest = Collections.max(Arrays.asList(map.getOutputSizes(ImageFormat.YUV_420_888)), new Comparator<Size>() {
                    @Override
                    public int compare(Size lhs, Size rhs) {
                        return Long.signum(lhs.getWidth() * lhs.getHeight() - rhs.getWidth() * rhs.getHeight());
                    }
                });
                localImageReader = ImageReader.newInstance(largest.getWidth(), largest.getHeight(), ImageFormat.YUV_420_888, 2);
                localImageReader.setOnImageAvailableListener(this, backgroundHandler);

                manager.openCamera(cameraId, stateCallback, backgroundHandler);
            }

        } catch (InterruptedException e) {
            Toast.makeText(getActivity(), "Open Camera Error!", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        } catch (CameraAccessException e) {
            Toast.makeText(getActivity(), "Open Camera Error!", Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }

    }

    private void startLocal() {
        try {
            cameraDevice.createCaptureSession(Arrays.asList(localSurface, localImageReader.getSurface()), new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(CameraCaptureSession session) {
                    try {
                        CaptureRequest.Builder builder = session.getDevice().createCaptureRequest(CameraDevice.TEMPLATE_RECORD);
                        //builder.addTarget(localImageReader.getSurface());
                        builder.addTarget(localSurface);
                        session.setRepeatingRequest(builder.build(), null, mainHandler);
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

    @Override
    public void onImageAvailable(ImageReader reader) {
        Log.i("LiveStream", "Image Avaiable");
    }
}
