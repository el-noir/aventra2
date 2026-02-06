import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto";
import { UserService } from "../users/user.service";
import bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {}

    async register(registerDto: RegisterDto) {
        const user = await this.userService.getUserByEmail(registerDto.email);

        if (user) {
            throw new ConflictException("Email Already Exists");
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const newUser = await this.userService.createUser({
            ...registerDto,
            password: hashedPassword
        });
        this.logger.log(`New user registered with email: ${newUser.email}`);
        const payload = { sub: newUser.id, name: newUser.name, email: newUser.email };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.userService.getUserByEmail(loginDto.email); 
        if (!user) {
            throw new UnauthorizedException("Email or Password is incorrect");
        }
        const match = await bcrypt.compare(loginDto.password, user.password);

        if (!match) {
            throw new UnauthorizedException("Email or Password is incorrect");
        }
        const payload = { sub: user.id, name: user.name, email: user.email };
        this.logger.log(`User logged in with email: ${user.email}`);
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

}