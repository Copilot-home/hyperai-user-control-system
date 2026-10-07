import http from 'http';

export interface CanonicalState {
  y: number[];
}

export class BoundaryClient {
  private host: string;
  private port: number;

  constructor(port: number = 0, host: string = '127.0.0.1') {
    this.port = port;
    this.host = host;
  }

  /**
   * Cập nhật port nếu Daemon python tự động gán port
   */
  public setPort(port: number) {
    this.port = port;
  }

  /**
   * Gửi dữ liệu qua loopback để Computational Boundary Layer chiếu và làm mượt
   */
  public async convolve(x: number[]): Promise<number[]> {
    if (this.port === 0) {
      throw new Error('BoundaryClient port chưa được khởi tạo.');
    }

    const payload = JSON.stringify({ x });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: '/convolve',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.y);
              } catch (e) {
                reject(new Error('Lỗi parse phản hồi từ Boundary Layer.'));
              }
            } else {
              reject(new Error(`Boundary Layer trả về lỗi: ${data}`));
            }
          });
        }
      );

      req.on('error', (e) => reject(e));
      req.write(payload);
      req.end();
    });
  }
}

// Singleton instance
export const boundaryClient = new BoundaryClient();
