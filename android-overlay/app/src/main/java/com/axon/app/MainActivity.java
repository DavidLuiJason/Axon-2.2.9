package com.axon.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.axon.app.background.BackgroundJobsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundJobsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
