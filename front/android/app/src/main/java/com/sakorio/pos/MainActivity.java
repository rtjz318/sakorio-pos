package com.sakorio.pos;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(Xp80tPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
