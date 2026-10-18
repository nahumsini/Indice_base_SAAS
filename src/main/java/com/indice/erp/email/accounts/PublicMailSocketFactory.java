package com.indice.erp.email.accounts;

import java.io.IOException;
import java.net.*;
import javax.net.SocketFactory;

/** Resolve once, reject non-public destinations, then pin every connection to that result. */
final class PublicMailSocketFactory extends SocketFactory {
    private static final java.util.Timer DEADLINES=new java.util.Timer("email-socket-deadline",true);
    private final InetAddress address;
    private final int port;
    PublicMailSocketFactory(String host,int port) throws IOException {
        var addresses=InetAddress.getAllByName(host);
        if(addresses.length==0)throw new IOException("Mail destination unavailable");
        for(var candidate:addresses)if(!isPublic(candidate))throw new IOException("Mail destination rejected");
        this.address=java.util.Arrays.stream(addresses).filter(Inet4Address.class::isInstance).findFirst().orElse(addresses[0]);this.port=port;
    }
    static boolean isPublic(InetAddress address) {
        if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()
            ||address.isSiteLocalAddress()||address.isMulticastAddress())return false;
        byte[] bytes=address.getAddress();int first=Byte.toUnsignedInt(bytes[0]),second=Byte.toUnsignedInt(bytes[1]);
        if(address instanceof Inet4Address) {
            int third=Byte.toUnsignedInt(bytes[2]);
            return first>0&&first<224&&first!=10&&first!=127
                &&!(first==100&&second>=64&&second<=127)
                &&!(first==169&&second==254)&&!(first==172&&second>=16&&second<=31)
                &&!(first==192&&(second==168||second==0&&(third==0||third==2)||second==88&&third==99))
                &&!(first==198&&(second==18||second==19||second==51&&third==100))
                &&!(first==203&&second==0&&third==113);
        }
        // Exclude transition, mapped, unique-local, link-local and documentation ranges.
        int third=Byte.toUnsignedInt(bytes[2]),fourth=Byte.toUnsignedInt(bytes[3]);
        return (first&0xe0)==0x20
            && !(first==0x20&&second==1&&(third<2||third==0x0d&&fourth==0xb8))
            && !(first==0x20&&second==2)
            && !(first==0x3f&&second==0xff&&(third&0xf0)==0);
    }
    @Override public Socket createSocket() {
        return new Socket(Proxy.NO_PROXY) {
            private java.util.TimerTask deadline;
            @Override public synchronized void close() throws IOException {if(deadline!=null)deadline.cancel();super.close();}
            @Override public void connect(SocketAddress endpoint,int timeout) throws IOException {
                if(!(endpoint instanceof InetSocketAddress target)||target.getPort()!=port)throw new IOException("Mail destination rejected");
                super.connect(new InetSocketAddress(address,port),Math.min(timeout>0?timeout:8000,8000));
                deadline=new java.util.TimerTask(){@Override public void run(){try{close();}catch(IOException ignored){ }}};DEADLINES.schedule(deadline,60000);
            }
        };
    }
    private Socket connected(int requestedPort) throws IOException {
        var socket=createSocket();socket.connect(new InetSocketAddress(address,requestedPort),8000);return socket;
    }
    @Override public Socket createSocket(String host,int port) throws IOException {return connected(port);}
    @Override public Socket createSocket(InetAddress host,int port) throws IOException {return connected(port);}
    @Override public Socket createSocket(String host,int port,InetAddress local,int localPort) throws IOException {return connected(port);}
    @Override public Socket createSocket(InetAddress host,int port,InetAddress local,int localPort) throws IOException {return connected(port);}
}
