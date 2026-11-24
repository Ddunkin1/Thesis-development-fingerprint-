using System.Runtime.InteropServices;

namespace ChaqBridge;

/// <summary>
/// Asks Windows (the Plug-and-Play manager) whether the scanner USB device is currently plugged in.
/// This works even when the ZKTeco driver is confused after an unplug, so the bridge can react within
/// about 2 seconds instead of waiting for the SDK to fail.
/// </summary>
internal static class UsbPresence
{
    private const uint CM_GETIDLIST_FILTER_ENUMERATOR = 0x00000001;
    private const uint CM_GETIDLIST_FILTER_PRESENT = 0x00000100;

    [DllImport("cfgmgr32.dll", CharSet = CharSet.Unicode)]
    private static extern int CM_Get_Device_ID_List_SizeW(out uint length, string filter, uint flags);

    [DllImport("cfgmgr32.dll", CharSet = CharSet.Unicode)]
    private static extern int CM_Get_Device_ID_ListW(string filter, [Out] char[] buffer, uint length, uint flags);

    /// <returns>true = plugged in, false = not plugged in, null = could not tell (caller falls back to the SDK).</returns>
    public static bool? IsVendorPresent(string vendorIdHex)
    {
        try
        {
            const uint flags = CM_GETIDLIST_FILTER_ENUMERATOR | CM_GETIDLIST_FILTER_PRESENT;
            if (CM_Get_Device_ID_List_SizeW(out uint len, "USB", flags) != 0 || len == 0) return null;
            var buffer = new char[len];
            if (CM_Get_Device_ID_ListW("USB", buffer, len, flags) != 0) return null;
            var wanted = "VID_" + vendorIdHex;
            foreach (var id in new string(buffer).Split('\0', StringSplitOptions.RemoveEmptyEntries))
                if (id.Contains(wanted, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }
        catch { return null; }
    }
}
