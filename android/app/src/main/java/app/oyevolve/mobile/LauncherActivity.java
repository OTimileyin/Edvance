package app.oyevolve.mobile;

import android.net.Uri;

/**
 * The app's entry point — a Trusted Web Activity that opens Oyevolve in the
 * device's own browser.
 *
 * The only thing this class adds is an identity tag on the launch URL. A TWA is
 * deliberately opaque in the other direction: the site cannot ask the shell what
 * version it is, and (per Chrome's own documentation) the app is not identified
 * in the User-Agent. So the shell says who it is at the moment it launches, and
 * the site reads it from the URL:
 *
 * <pre>https://oyevolve.vercel.app/?app=android&amp;v=3</pre>
 *
 * The value comes from {@link BuildConfig#VERSION_CODE}, which Gradle takes from
 * {@code android/version.json}. That is the installed build speaking about
 * itself, so it cannot drift from what was actually shipped the way a
 * hand-maintained constant would.
 *
 * The site compares that number against the newest published build and, when
 * there is a newer one, offers it. Every cold start re-derives the URL, so the
 * tag is always the truth about the APK on the device.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        return super.getLaunchingUrl()
                .buildUpon()
                .appendQueryParameter("app", "android")
                .appendQueryParameter("v", Integer.toString(BuildConfig.VERSION_CODE))
                .build();
    }
}
